// Entry point for the trs server, ie the entire back end. 
class TrsServer {
    constructor() {
        // Node packages.
        this.bodyParser  = require('body-parser');
        this.createError = require('http-errors');
        
        this.Express     = require('express');
        this.express     = this.Express();

        this.Sequelize = require('sequelize');
        this.sequelize;

        // Our own packages.
        this.TrsModels   = require('./TrsModels'); // Path is relative to this file.
        this.trsModels;

        this.TrsServerAuth  = require('./TrsServerAuth');
        this.trsServerAuth;
    }
    init() {
        this.express.use(this.bodyParser.urlencoded({ extended: true }));
        this.express.use(this.bodyParser.json()); // To receive and parse json data. NOT USED.
        this.initDatabase();
        this.trsModels     = new this.TrsModels(this.Sequelize, this.sequelize);
        this.trsServerAuth = new this.TrsServerAuth(this.trsModels);

        // Run test. This drops and populates the users table. Disable for produiction. =====
        this.trsModels.runUnitTest(this.trsServerAuth);

        // ----- Setup routes -----
        this.express.get('/getData', (request, response) => { 
            let getType = request.query.getType;
            switch (getType) {
                case 'oneRecord':
                    this.processGetRecord(request, response).then( ()=> { response.end(); });
                    break;
                case 'allRecords':
                    this.processGetAllRecords(request, response).then( ()=> { response.end(); });
                    break;
                default:
                    console.log('Unknown getType: ' + getType);
                    break;
            }
        });
        this.express.post('/mutateData', (request, response) => { 
            let mutateType = request.body.mutateType;
            // No token needed to logon.
            if (mutateType === 'authorizeLogon') {
                this.processAuthorizeLogon(request, response).then( ()=> { response.end(); });
                return;
            }
            this.trsServerAuth.validateToken(request).then( ()=> { 
                // validateToken sets request.app, a pretty handy bundle of data.
                if (request.app.isError) {
                    this.invalidAuthorization(response, request.app.error);
                    return;
                };
                // Must be orgAdmin or systemAdmin to mutate users table. Later more tables. ============
                let tableName = request.body.table;
                if (tableName === this.TrsModels.USERS_TABLE && ! (request.app.isOrgAdmin || request.app.isSystemAdmin)) {
                    this.invalidAuthorization(response, 'Must be an administrator to edit the users table.');
                    return;
                }
                switch (mutateType) {
                    case 'addRecord':
                        this.processAddRecord(request, response).then( ()=> { response.end(); });
                        break;
                    case 'updateRecord':
                        this.processUpdateRecord(request, response).then( ()=> { response.end(); });
                        break;
                    case 'deleteRecord':
                        this.processDeleteRecord(request, response).then( ()=> { response.end(); });
                        break;
                    default:
                        console.log('Unknown mutateType: ' + mutateType);
                        break;
                }
            });
        });
        // app.get('/', function(req, res){ res.sendfile('index.html'); });
        // Even better:
        this.express.use(this.Express.static("public")) // serve the whole directory

        // ----- Additional prep -----
        // Catch 404 error.
        let that = this;
        this.express.use(function(request, response, next) {
            response.end(that.fileNotFoundError(request.url));
        });
        // Catch javascript errors.
        this.express.use(function(error, request, response, next) {
            console.log('Error: ' + error.message); // Later call method. =====
        });
        // ----- Listen for requests from client -----
        const PORT = 3000;
        this.express.listen(PORT, () => console.log(`Server ready at http://localhost:${PORT}`) );
    }
    invalidAuthorization(response, errorMessage) {
        let result      = {};
        result.success = false;
        result.error = errorMessage;

        response.json(result); // This seems to also end the call.
        response.end();
    }
    // ----- Gets -----
    async processGetRecord(request, response) {
        let tableName = request.query.table;
        let id = parseInt(request.query.id);
        //console.log('processGetRequest tableName = ' + tableName + ', id = ' + id);
        let model = this.trsModels.getModel(tableName);
        // Get the requested record.
        let result;
        await model.getRecord(id).then(record => {
            //console.log('processGetRecordRequest = ' + JSON.stringify(record));
            result = record;
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(result);
    }
    async processGetAllRecords(request, response) {
        let tableName = request.query.table;
        //console.log('processGetAllRecords tableName = ' + tableName);
        let model = this.trsModels.getModel(tableName);
        // Get the requested record.
        let result;
        await model.getAllRecords(request.query.whereFilter).then(records => {
            //console.log('processGetAllRecords = ' + JSON.stringify(records));
            result = records;
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(result);
    }
    // ----- Mutations -----
    async processAddRecord(request, response) {
        let tableName = request.body.table;
        //console.log('processAddRecord tableName = ' + tableName);
        let model = this.trsModels.getModel(tableName);
        // Get the requested record.
        let mutationResult;
        let providedRecord = request.body.newRecordValues; 
        await model.addRecord(providedRecord)
        .then(newId => {
            //console.log('processAddRecord newId = ' + newId);
            mutationResult = { success: true, id: newId };
        })
        .catch(mutationError => { 
            // Common error is add record violates unique value, like users emailAddress must be unique.
            let errorText = this.getMutationErrorMessage(mutationError);
            //console.log('processAddRecord error = ' + errorText);
            mutationResult = { success: false, error: errorText };
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(mutationResult);
    }
    async processUpdateRecord(request, response) {
        let tableName = request.body.table;
        //console.log('processUpdateRecord tableName = ' + tableName);
        let model = this.trsModels.getModel(tableName);
        let mutationResult;
        let options = request.body; 

        await model.updateRecord(options.id, options.updateValues)
        .then(successResult => {
            //console.log('processUpdateRecord newId = ' + newId);
            mutationResult = { success: successResult };
            if (! successResult) mutationResult.error = 'Record not found.'; // An assumption.
        })
        .catch(mutationError => { 
            // Common error is update violates unique value, like users emailAddress must be unique.
            let errorText = this.getMutationErrorMessage(mutationError);
            console.log('processUpdateRecord error = ' + errorText);
            mutationResult = { success: false, error: errorText };
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(mutationResult);
    }
    async processDeleteRecord(request, response) {
        let tableName = request.body.table;
        let model = this.trsModels.getModel(tableName);
        let mutationResult;

        await model.deleteRecord(request.body.id)
        .then(successResult => {
            mutationResult = { success: successResult };
            if (! successResult) mutationResult.error = 'Record not found.'; // An assumption.
        })
        .catch(mutationError => { 
            let errorText = this.getMutationErrorMessage(mutationError);
            console.log('processDeleteRecord error = ' + errorText);
            mutationResult = { success: false, error: errorText };
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(mutationResult);
    }
    async processAuthorizeLogon(request, response) {
        let suppliedEmailAddress = request.body.emailAddress;
        let suppliedPassword     = request.body.password;
        //console.log('processAuthorizeLogon ' + suppliedEmailAddress + ' ' + suppliedPassword);
        
        // Get the user record. The emailAddress is unique.
        let whereFilter = JSON.stringify({ emailAddress: suppliedEmailAddress });
        let model       = this.trsModels.getModel(this.TrsModels.USERS_TABLE);
        let result      = {};

        await model.getAllRecords(whereFilter, true).then(records => { // true for preservePassword.
            if (records.length === 0) {
                result.success = false;
                result.error = 'Email address not found.';
            } else {
                let record = records[0];
                let hashedPassword = record.password;

                // Validate supplied against stored hashed password.
                if (this.trsServerAuth.isCorrectPassword(suppliedPassword, hashedPassword)) {
                    // Valid logon.
                    result.success       = true;
                    result.fullName      = record.fullName;
                    result.isOrgAdmin    = record.isOrgAdmin;
                    result.isSystemAdmin = record.isSystemAdmin;
                    // The client should send the token in all mutate requests if user is logged on.
                    let token = this.trsServerAuth.createToken(record.id);
                    result.token = token;

                } else {
                    result.success = false;
                    result.error = 'Invalid password.';                    
                }
            }
        });
        // Convert object to json, put in response. This converts undefined to ''.
        response.json(result);
    }
    // ----- Helpers -----
    getMutationErrorMessage(error) {
        return error.name + ': ' + error.errors[0].message;
    }
    initDatabase() {
        // Open connection to the db.
        this.sequelize = new this.Sequelize('trs', 'root', '1234', {
            host: 'localhost',
            dialect: 'mysql',
            operatorsAliases: false,
            logging: false,
            //insecureAuth: true, // No longer needed.
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        });
        // Verify the connection is established.
        this.sequelize.authenticate()
            .then(() => {
                //console.log('Connection has been established successfully.');
            })
            .catch(err => {
                console.error('Unable to connect to the database:', err);
        });
    }
    // Need to beautify these very raw pages. =====================
    fileNotFoundError(url) {
        let text = `
        <html>
        <head><title>Error 404 - File Not Found</title></head>
        <body>
            <p>Error 404 - File Not Found</p>
            <p>Sorry, cannot find the file ${url}</p>
        </body>
        </html>
        `;
        return text;
    }
    javascriptError(errorMessage) {
        let text = `
        <html>
        <head><title>Error</title></head>
        <body>
            <p>Error: ${errorMessage}</p>
        </body>
        </html>
        `;
        return text;
    }
}
module.exports = TrsServer;

// These must be after the class is defined and exported.
const trsServer = new TrsServer();
trsServer.init();