/* Contents:
    class TrsRequestor - Handles client http requests.
*/
class TrsRequestor {
    static get USERS_TABLE()     { return 'users'; }

    constructor() {
        this.token; 
    }
    // ----- Convenience methods for main server requests -----
    getOneRecord(tableName, recordId, callback) {
        this.getData({ getType: 'oneRecord', table: tableName, id: recordId }, callback);
    }
    getAllRecords(tableName, callback) {
        this.getData({ getType: 'allRecords', table: tableName }, callback);
    }
    getAllRecordsWhere(tableName, whereFilter, callback) {
        this.getData({ getType: 'allRecords', table: tableName, whereFilter: whereFilter }, callback);
    }
    addRecord(tableName, newRecordValues, callback) {
        let options = {};
        options.mutateType      = 'addRecord';
        options.table           = tableName;
        options.newRecordValues = newRecordValues;
        this.mutateData(options, callback);
    }
    updateRecord(tableName, recordId, updateValues, callback) {
        let options = {};
        options.mutateType = 'updateRecord';
        options.table      = tableName;
        options.id         = recordId;
        options.updateValues = updateValues;

        this.mutateData(options, callback);
    }
    deleteRecord(tableName, recordId, callback) {
        let options = {};
        options.mutateType = 'deleteRecord';
        options.table      = tableName;
        options.id         = recordId;

        this.mutateData(options, callback);
    }
    authorizeLogon(emailAddress, password, callback) {
        let options = {};
        options.mutateType   = 'authorizeLogon';
        options.emailAddress = emailAddress;
        options.password     = password;

        this.mutateData(options, callback);
    }
    // ----- Main server requests -----
    getData(options, callback) {
        //console.log('requestor getRecord');
        let request = new XMLHttpRequest();
        let query = '/getData?' + this.convertOptionsToQueryString(options);

        request.open('GET', query, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestHeader('Accept',       'application/json');

        request.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                if (this.responseText === '') {
                    callback(undefined); // Not found.
                } else {                    
                    let recordset = JSON.parse(this.responseText); // One or more records.
                    //console.log('requestor result fullName = ' + recordset.fullName);
                    callback(recordset);
                }
            }
        };
        request.send();
    }
    mutateData(options, callback) {
        //console.log('requestor getRecord');
        let request = new XMLHttpRequest();
        let query = '/mutateData';

        request.open('POST', query, true);
        request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        request.setRequestHeader('Accept',       'application/json');
        if (this.token) request.setRequestHeader('x-access-token', this.token);

        request.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {                  
                let mutationResult = JSON.parse(this.responseText); 
                //if (! mutationResult.success) alert('Error: ' + mutationResult.error);
                callback(mutationResult);
            }
        };
        // let optionsString = this.convertOptionsToQueryString(options);
        let optionsString = JSON.stringify(options);
        request.send(optionsString);
    }
    // ----- Helpers -----
    convertOptionsToQueryString(options) {
        let text = '';
        let keys = Object.keys(options);
        for (let key of keys) {
            if (key === 'whereFilter') {
                text += key + '=' + JSON.stringify(options[key]) + '&';
            } else {
                text += key + '=' + options[key] + '&'; 
            }
        } 
        // Remove the '&' at the end.
        text = text.slice(0, text.length - 1);
        return text;
    }
}