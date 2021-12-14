const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const options = require('./settings.js');



class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}



class Dataset_cleaner {
    
    constructor(CaseID, DeloNum, ActivityType) {
        this.CaseID            = CaseID;
        this.DeloNum           = DeloNum;
        this.ActivityType      = ActivityType;
    }
    
    static purifier (obj) {
        
        let CaseID            = obj.CaseID;
        let DeloNum           = this.purifier_DeloNum(obj.DeloNum);
        let ActivityType      = obj.ActivityType;
        let Grantor           = this.purifier_Grantor(obj.Grantor);
        let ComplainedMarshal = obj.ComplainedMarshal;
        let Suspended         = obj.Suspended;
        
        return new Validator(CaseID, DeloNum, ActivityType, Grantor, ComplainedMarshal, Suspended);
    
    }
    
    static purifier_DeloNum (value) {
        
        value = value.replace(/\s+/g, "");
        value = value.replace(/,\d+\/\d+\/\d+-СД/g, "");
        value = value.replace(/,\d+\/\d+\/\d+\/\d+-СД/g, "");
        value = value.replace(/-Ип$|-иП$|-ип$/, "-ИП");
        value = value.replace(/№/g, "")
        
        let prefix = value.substring(value.length - 3);     // n..n/yy/dd/rr или n..n/yy/ddddd-ИП
        
        if ((prefix === '-ИП') || (/^\d+\/\d{2}\/\d{2}\/\d{2}$/.test(value))) {
            return value;
        } else {
            return value + '-ИП';
        }
    }
    
    static purifier_Grantor (value) {
        
        switch (String(value)) {
            case '1':
                return "SVEA";     
            case '2':
                return "RSC";
            default:
                return String(value)
            }
        }
    }
    
    
    
class Validator extends Dataset_cleaner {
    
    constructor (CaseID, DeloNum, ActivityType, Grantor, ComplainedMarshal, Suspended) {
        
        super (CaseID, DeloNum, ActivityType);

        this.Grantor                      =  Validator.verify_Grantor(Grantor);

        this.Suspended                    =  Suspended;


        if (ComplainedMarshal) {
            
            try {

                this.ComplainedMarshal    = ComplainedMarshal;
                
                ComplainedMarshal         =  Validator.verify_length(ComplainedMarshal.match(/[а-яА-ЯёЁ. -]+/)[0].replace(/\s+/g, " ").split(" "));
                
                
                this.ComplainedSurname    =  Validator.verify_ComplainedSurname(ComplainedMarshal[0]);
                this.ComplainedName       =  Validator.verify_ComplainedName(ComplainedMarshal[1]);
                this.ComplainedMiddlename =  Validator.verify_ComplainedMiddlename(ComplainedMarshal[2]);
            
            } catch (error) {
                console.error(`${newLineChar}${error.name} occured during processing 'ComplainedMarshal' value relevant to '${CaseID}' case and '${DeloNum}' enforcement proceedings! Error's message: ${error.message}`);
                throw error
            }
        }
    
    }
    

    static verify_length (arr) {
        
        if (arr.length === 1) {
            arr.push("-");
        }
        
        if (arr.length === 2) {
            arr.push("-");
        }
    
        if (arr.length !== 3) {
            throw new ValidationError(`Marshal's personal name is not full! Received value: ${arr}`);
        }
            
        return arr;
    
    }

    
    static verify_ComplainedSurname (Surname) {
            
        if (!/^[а-яА-ЯёЁ-]+$/.test(Surname)) {
            throw new ValidationError(`Something is wrong with Marshal's surname! Received value: ${Surname}`);
        }
            
        return Surname;
        
    }
        
    static verify_ComplainedName (Name) {
            
        if (!/^[а-яА-ЯёЁ]\.$|^[а-яА-ЯёЁ]$/.test(Name) && (Name !== "-")) {
            throw new ValidationError(`Something is wrong with Marshal's name! Received value: ${Name}`);
        }
            
        return Name;
    }
        
    static verify_ComplainedMiddlename (Middlename) {
            
        if ((!/^[а-яА-ЯёЁ]\.$|^[а-яА-ЯёЁ]$/.test(Middlename)) && (Middlename !== "-")) {
            throw new ValidationError(`Something is wrong with Marshal's middlename! Received value: ${Middlename}`);
        }
            
        return Middlename;
    }
        
    static verify_Grantor (Grantor) {
        
        const expected_grantors = options.grantors;
            
        if (!expected_grantors.includes(Grantor)) {
            throw new ValidationError(`Grantor is not correctly specified! Received value: ${Grantor}`);
        }
            
        return Grantor;
    }
}

module.exports = Dataset_cleaner;