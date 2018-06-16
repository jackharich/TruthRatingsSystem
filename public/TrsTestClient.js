// Setup and excercise the test client.
let clientAuth;
let testClient;

class TrsTestClient {
    static init() {
        testClient = new TrsTestClient();
    }
    constructor() {
        this.requestor      = new TrsRequestor();
        clientAuth          = new TrsClientAuth(this.requestor);
        this.resultContents = document.querySelector('.result-contents');
    }
    // ----- Data persistance test methods.
    clearContent() {
        this.resultContents.innerHTML = '';
    }
    getUser() {
        this.requestor.getOneRecord(TrsRequestor.USERS_TABLE, 2, (record) => { 
            if (record) {
                this.updateResults('Got ' + record.id + ' ' + record.fullName);
            } else {
                this.updateResults('Not found.');
            }
        });
    } 
    getAllUsers() {
        this.requestor.getAllRecords(TrsRequestor.USERS_TABLE, (records) => { 
            if (records) {
                this.updateResults('--- getAllRecords');
                for (let record of records) {
                    this.updateResults(record.id + ' ' + record.fullName + ' ' + record.emailAddress);
                }
            } else {
                this.updateResults('getAllRecords failed.');
            }
        });
    }
    getAllUsersWhere() {
        this.requestor.getAllRecordsWhere(TrsRequestor.USERS_TABLE, { orgId: 2 }, (records) => { 
            if (records) {
                this.updateResults('--- getAllRecordsWhere orgId = 2');
                for (let record of records) {
                    this.updateResults(record.id + ' ' + record.fullName + ' ' + record.emailAddress);
                }
            } else {
                this.updateResults('getAllRecords failed.');
            }
        });
    }
    addUser() {
        let newRecordValues = {};        
        newRecordValues.fullName      = 'Philip Bangerter';
        newRecordValues.password      = 'landofoz'; // Not hashed, good enough for a test.
        newRecordValues.emailAddress  = 'p.bangerter@uq.edu.au';
        newRecordValues.isOrgAdmin    = false;
        newRecordValues.isSystemAdmin = false;
        newRecordValues.orgId         = 2;

        this.requestor.addRecord(TrsRequestor.USERS_TABLE, newRecordValues, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Added id=' + mutationResult.id);
            } else {
                // Due to emailAddress must be unique, record already there.
                this.updateResults('Add failed due to errror - ' + mutationResult.error); 
            }
        });
    }
    updateUser() {
        let updateValues = {};
        updateValues.fullName      = 'CHANGED NAME';
        updateValues.isOrgAdmin    = true;

        this.requestor.updateRecord(TrsRequestor.USERS_TABLE, 5, updateValues, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Update id=5 succeeded');
            } else {
                this.updateResults('Update id=5 failed due to errror - ' + mutationResult.error); 
            }
        });
    }
    deleteUser() {
        this.requestor.deleteRecord(TrsRequestor.USERS_TABLE, 5, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Delete id=5 succeeded');
            } else {
                this.updateResults('Delete id=5 failed due to errror - ' + mutationResult.error);  
            }
        });
    }
    // ----- Persistance helpers.
    updateResults(text) {
        this.resultContents.innerHTML += `<p>${text}</p>`;
    }    
}