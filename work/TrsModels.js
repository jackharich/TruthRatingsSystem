/* Contents:
    class TrsModels - Manages the database tables, aka models.
    class TrsModel  - The superclass for other models.
    class TrsModelUsers - Subclass for users table.xx
    Note - I was unable to put subclasses in separate files. Couldn't get export/require to work.
*/
class TrsModels {
    static get USERS_TABLE()     { return 'users'; }

    constructor(Sequelize, sequelize) {
        this.Sequelize = Sequelize;
        this.sequelize = sequelize;
        this.models = new Map(); // Key is table name, value is TrsModel instance.
        // Add tables.
        let users = new TrsModelUsers(Sequelize, sequelize);
        this.models.set(users.name, users);
    } 
    getModel(name) {
        let model = this.models.get(name); 
        if (model) {
            return model;
        } else {
            console.log('Error: getModel() - Table name ' + name + ' not found.');
            return undefined;
        }
    }
    runUnitTest(trsServerAuth) {
        // Create hashed pwd. 
        // console.log('Hash for democratic = ' + trsServerAuth.createHashedPassword('democratic'));

        let usersTable = this.getModel(TrsModels.USERS_TABLE).table;

        // force: true will drop the table if it already exists. <-----<<< A critical flag. =============
        usersTable.sync({force: true}).then(() => {
            // Table created. Add users. Promise chain used to get admin id same every time.
            usersTable.create({
                fullName: 'Administrator',
                //password: 'admin',
                password: '$2a$10$hV4q2.trW8n0TPn9KDhBI.AFrLWLPXZ.Pi1zljDTjTdJE/tEdGho2',
                emailAddress: 'admin', // Let's see if this is a problem. It's not valid.
                orgId: 1,
                isOrgAdmin: true,
                isSystemAdmin: true,
            }).then( ()=> { 
                usersTable.create({
                    fullName: 'Martha Harich',
                    // password: 'democratic',
                    password: '$2a$10$FZg1A3RF0ReuIRD.lCkl.OYfgaWoyzQ19HnQRlHrbjUM/gX7pNYfO',
                    emailAddress: 'martha_annie@thwink.org',
                    orgId: 2,
                });                
            }).then( ()=> { 
                usersTable.create({
                    fullName: 'Jack Harich',
                    // password: 'sustainablenow',
                    password: '$2a$10$V1Jl9dEc9J6vN/uikXA4.uCrMq7YEfR9FOT.pvntaWFBg0tqk2SLu',
                    emailAddress: 'jack@thwink.org',
                    orgId: 1,
                    isOrgAdmin: true,
                    isSystemAdmin: true,
                });
            }).then( ()=> { 
                usersTable.create({  
                    fullName: 'Scott Booher',
                    // password: 'candlevision',
                    password: '$2a$10$/IsfWJYjPRApC9BnDKkgm.GF2hWrnW1AiiBlX.nBoG1Wz9Oru.Mha',
                    emailAddress: 'scott@thwink.org',
                    orgId: 2,
                    isOrgAdmin: true,
                    isSystemAdmin: true,  
                });              
            }).then( () => {		
                this.getTestData(usersTable);
            });
        });
    }
    getTestData(usersTable) { 
        let usersModel = this.getModel(TrsModels.USERS_TABLE);
        // Test addRecord().
        let record = {};
        record.fullName = 'Montserrat Kollofon';
        // record.password = 'researchsuccess',
        record.password = '$2a$10$cQeQrVCt2JxtjLYqU8nteutBcmqCaBEuC3Gq2X7od/QcA/LnB.5Sq',
        record.emailAddress = 'montserrat@thwink.org';
        record.orgId = 1;

        usersModel.addRecord(record).then(newId => {
            //console.log('2---> addRecord newId = ' + newId);
        });
        return; // ==================== Skip further unit tests.

        // Test getAllRecords().
        usersModel.getAllRecords().then(records => {
            console.log('3---> getAllRecords result = ');
            for (let record of records) {
                console.log('      id: ' + record.id + ', fullName: ' + record.fullName);
            }
        });
        // Test getRecord().
        usersModel.getRecord(2).then(record => {
            console.log('4---> getRecord result = ' + JSON.stringify(record));
        });
        // Test deleteRecord()
        usersModel.deleteRecord(3).then(success => {
            console.log('5---> deleteRecord success = ' + success);
        });
        // Test updateRecord()
        let updateValues = { fullName: 'Changed Name', emailAddress: 'nowhere@gmail.com' };
        usersModel.updateRecord(2, updateValues).then(success => {
            console.log('6---> updateRecord success = ' + success);
        });
    }
} // End class TrsModels

class TrsModel { // The superclass for other models. ALL public methods are async so they return promises.
    constructor(Sequelize, sequelize) {
        this.Sequelize = Sequelize;
        this.sequelize = sequelize;
        this.name;
        this.table;
    }
    // ----- Basic methods -----
    // Returns an array of record objects in defauilt order. Array is empty if no records found.
    // Later will implement pagination. See http://docs.sequelizejs.com/manual/tutorial/querying.html.
    // whereFilter is optional. Example: { orgId: 2 }. See above link for advanced use of whereFilter.
    // preservePassword is true to not remove password.
    async getAllRecords(whereFilter, preservePassword) {
        let result;
        let defaultOrder = this.getStandardOrder();
        let options = {order: defaultOrder}
        if (whereFilter) options.where = JSON.parse(whereFilter);
        //console.log('getAllRecords options = ' + JSON.stringify(options));

        await this.table.findAll(options).then(records => {
            if (records) {
                result = this.convertSequelizeResultToArrayOfRecordObjects(records);
                if (this.name === TrsModels.USERS_TABLE && ! preservePassword) { // If users table remove password.
                    for (let record of result) { record.password = undefined; }
                }
            }
        }); 
        return result;
    }
    // Returns the record object or undefined if not found.
    async getRecord(id) {
        let result;
        await this.table.findById(id).then(record => {
            if (record) {
                result = record.dataValues; // A JSON object.
                if (this.name === TrsModels.USERS_TABLE) result.password = undefined; // If users table remove password.
            }
        }); 
        return result;
    }
    // Deletes the record. Returns true or false for success.
    async deleteRecord(deleteId) {
        let success = false;
        await this.table.destroy({ where: { id: deleteId } }).then(deletedId => {
            success = deletedId > 0;
        }); 
        return success;
    }
    // Updates the record with the provided attribute values. Returns true or false for success.
    // Example: updateValues = { name: 'changed name', age: 37 }
    async updateRecord(updateId, updateValues) {
        let success = false;
        await this.table.update(updateValues, { where: { id: updateId } }).then(numberOfAffectedRows => {
            success = numberOfAffectedRows > 0;
        }); 
        return success;
    }
    // ----- Helpers -----
    convertSequelizeResultToArrayOfRecordObjects(sequealizeRecords) {
        let records = [];
        for (let item of sequealizeRecords) {
            records.push(item.dataValues);
        }
        return records;
    }
} // End class TrsModel

class TrsModelUsers extends TrsModel {
    constructor(Sequelize, sequelize) {
        super(Sequelize, sequelize);
        this.name = TrsModels.USERS_TABLE;
        this.table = this.sequelize.define(this.name, { 
            fullName:      { type: this.Sequelize.STRING, allowNull: false },
            password:      { type: this.Sequelize.STRING, allowNull: false },
            emailAddress:  { type: this.Sequelize.STRING, allowNull: false, unique: true },
            isOrgAdmin:    { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: false },
            isSystemAdmin: { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: false },
            orgId:         { type: Sequelize.INTEGER,     allowNull: false },
        });
    }
    // ----- These are methods all subclasses must implement.
    getStandardOrder() {
        return [ ['fullName', 'ASC'] ];
    }
    // Adds one record using the provided record, which contains initial data and no id. Returns new id.
    async addRecord(record) {
        //console.log('users addRecord entered');
        let id;
        await this.table.create({  
            fullName: record.fullName,
            password: record.password,
            emailAddress: record.emailAddress,
            orgId: record.orgId
        // Get the new id via a promise. 
        }).then(record => {		
            id = record.id;
            //console.log('users addRecord id = ' + id);
            //console.log('1---> Inside addRecord() new id = ' + id);
        });
        return id;
    }
} // End class TrsModelUsers

module.exports = TrsModels;