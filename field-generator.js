const fs      = require('fs');
const options = require('./settings.js');


module.exports = class Fields {
   
    constructor (DeloNum, TextShort, Text, File, Grantor, ComplainedSurname, ComplainedName, ComplainedMiddlename) {
       this.DeloNum              = DeloNum;
       this.TextShort            = TextShort;
       this.Text                 = Text;
       this.File                 = File;
       this.Grantor              = Grantor;
       this.ComplainedSurname    = ComplainedSurname;
       this.ComplainedName       = ComplainedName;
       this.ComplainedMiddlename = ComplainedMiddlename;
    }
    
    static create_values (obj) {
 
       let Text, File;
 
       if (obj.Grantor === "SVEA") {
 
         Text = fs.readFileSync(options.directory_tree.attachments_path + options.file_structure.enquiry_SVEA, 'utf8');
         File = options.directory_tree.attachments_path + options.file_structure.PoA_SVEA;
 
       } else if (obj.Grantor === "RSC") {
 
         Text = fs.readFileSync(options.directory_tree.attachments_path + options.file_structure.enquiry_RSC, 'utf8');
         File = options.directory_tree.attachments_path + options.file_structure.PoA_RSC;
 
       }
 
       return new Fields(obj.DeloNum, 'Запрос о ходе ИП', Text, File, obj.Grantor, obj.ComplainedSurname, obj.ComplainedName, obj.ComplainedMiddlename);  
    }
 }