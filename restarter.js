const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

module.exports = class Restart {

    constructor(processing_obj, permitted_attempts) {
        this.decision = Restart.Conclude(JSON.stringify(processing_obj), permitted_attempts);
        this.attempts = permitted_attempts;
    }
    
    static rerun_indicator = new Map();

    static Conclude (state, attempts) {
        
        if (this.rerun_indicator.has(state)) {
            this.rerun_indicator.set(state, this.rerun_indicator.get(state) + 1)
        } else {
            this.rerun_indicator.clear();
            this.rerun_indicator.set(state, 0)
        }

        if (this.rerun_indicator.get(state) < attempts) {
            return true
        }
        
        return false

    }

    do (func, delay) {

        if (this.decision) {
            console.log(`${newLineChar}Script is automatically restarted in ${delay}ms`)
            setTimeout(func, delay);
        } else {
            console.log(`${newLineChar}The restart limit(more than ${this.attempts} attempts) were overstepped!`)
        }

    }
    
}


/*
    -- monitoring class system initialization --  
        
        let restart_object = new Restart ('the current state of a program' as argument_1, 'number of permitted attempts to reset in one state' as argument_2)

    -- restart system initialization:           
    
        if (restart_object.decision) restart_object.do('Function.name intended to be restarted' as argument_1, 'delay before a reset (in milliseconds)' as argument_2)

*/
