module.exports = class User {
    
    constructor (builder) {
        this.login         = builder.login;
        this.password      = builder.password;
        this.location      = builder.location;
        this.claimant      = builder.claimant;
        this.address       = builder.address;
    }
}