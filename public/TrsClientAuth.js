/* Contents 
    class TrsServerAuth - Handles authentication and authorization on the client.
        This includes managing the logon form and logon logoff buttons.
*/
class TrsClientAuth {
    static get LOGGED_OFF_MODE() { return 'loggedOff'; } // Show only logon button.
    static get LOGGING_ON_MODE() { return 'loggingOn'; } // Show only logon form.
    static get LOGGED_ON_MODE()  { return 'loggedOn';  } // Show only logoff button.

    static get AUTH_KEY() { return 'trsAuth'; }

    constructor(requestor) {
        this.requestor = requestor;
        this.mode;
        // this.authState = { isOrgAdmin: false, isSystemAdmin: false, token: undefined };
        this.authState;
        this.isLoggedOn    = false; // True if token present.

        // Logon form.
        this.logonBoxElement     = document.querySelector('.trs-logon-box');
        this.logonButtonElement  = document.querySelector('.trs-logon-logon');
        this.logoffButtonElement = document.querySelector('.trs-logon-logoff');
        this.nameElement         = document.querySelector('.trs-logon-name');

        this.userIdElement       = document.querySelector('.trs-logon-userid');
        this.passwordElement     = document.querySelector('.trs-logon-password');

        this.userIdElement.addEventListener(  'keydown', ()=>{ this.userIdPasswordKeydownEvent(event); } );
        this.passwordElement.addEventListener('keydown', ()=>{ this.userIdPasswordKeydownEvent(event); } );

        // Initial mode. If token exists, initial mode is LOGGED_ON
        let state = this.getAuthState();
        if (state) {
            // Check for token expiration. ==========================?

            // User is logged in.
            this.changeToMode(TrsClientAuth.LOGGED_ON_MODE, state);
        } else {
            this.changeToMode(TrsClientAuth.LOGGED_OFF_MODE);
        }
    }
    // ----- Button events -----
    logon() {
        this.changeToMode(TrsClientAuth.LOGGING_ON_MODE);
    }
    logoff() {
        this.changeToMode(TrsClientAuth.LOGGED_OFF_MODE);
    }
    logonForgot() {
        alert('This feature is not yet implemented.');
    }
    logonCancel() {
        this.changeToMode(TrsClientAuth.LOGGED_OFF_MODE);
    }
    logonOkay() {
        let emailAddress = this.userIdElement.value.trim();
        let password     = this.passwordElement.value.trim();

        // Validate input. Both fields are required.
        if (emailAddress.length === 0) {
            alert('Email address is required.');
            return;
        }
        if (password.length === 0) {
            alert('Password is required.');
            return;
        }
        // Request authorization from server.
        this.requestor.authorizeLogon(emailAddress, password, (mutationResult) => { 
            if (mutationResult.success) {
                let newAuthState = {};
                newAuthState.fullName        = mutationResult.fullName;
                newAuthState.isOrgAdmin      = mutationResult.isOrgAdmin;
                newAuthState.isSystemAdmin   = mutationResult.isSystemAdmin;
                newAuthState.token           = mutationResult.token;

                this.changeToMode(TrsClientAuth.LOGGED_ON_MODE, newAuthState);
                this.saveAuthState();
                //console.log('Token: ' + mutationResult.token);

            } else {
                alert(mutationResult.error + ' Please try again.');
                // No mode change. User can cancel.
            }
        });
    }
    // ----- Helpers -----
    changeToMode(newMode, newAuthState) {
        switch(newMode) {

            case TrsClientAuth.LOGGED_OFF_MODE:
                this.logonBoxElement.style.display     = 'none';
                this.logonButtonElement.style.display  = '';
                this.logoffButtonElement.style.display = 'none';
                this.nameElement.style.display         = 'none';

                this.authState       = undefined;
                this.requestor.token = undefined; 
                this.deleteAuthState();               
                break;

            case TrsClientAuth.LOGGING_ON_MODE:
                this.logonBoxElement.style.display     = '';
                this.logonButtonElement.style.display  = 'none';
                this.logoffButtonElement.style.display = 'none';
                this.nameElement.style.display         = 'none';

                this.authState       = undefined;
                this.requestor.token = undefined; 
                this.deleteAuthState();  
                break;

            case TrsClientAuth.LOGGED_ON_MODE:
                this.logonBoxElement.style.display     = 'none';
                this.logonButtonElement.style.display  = 'none';
                this.logoffButtonElement.style.display = '';
                this.nameElement.style.display         = '';
                this.nameElement.innerHTML             = newAuthState.fullName;

                this.authState       = newAuthState;
                this.requestor.token = this.authState.token;; 
                break;
        }
        this.mode = newMode;
    }
    userIdPasswordKeydownEvent(event) {
        if (event.key === 'Enter') this.logonOkay();
    }
    // ----- Token local storage -----
    deleteAuthState() {
        window.localStorage.removeItem(TrsClientAuth.AUTH_KEY);
    }
    saveAuthState() {
        window.localStorage.setItem(TrsClientAuth.AUTH_KEY, JSON.stringify(this.authState));
    }
    getAuthState() {
        let state = window.localStorage.getItem(TrsClientAuth.AUTH_KEY);
        if (state) {
            return JSON.parse(state);
        } else {
            return undefined;
        }
    }
    
}