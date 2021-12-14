const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const config   = require('./settings.js').sender_config;
const options  = require('./settings.js');
const Emitter  = require("events");

const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

let emitter = new Emitter();


emitter.on("success", function FilesRemoval (old_path_to_csv_file, new_path_to_csv_file, csv_file) {
  
  fs.rename(old_path_to_csv_file + csv_file, new_path_to_csv_file + csv_file, function(err) {
    
    if (err) {
      console.error(`${newLineChar}${err.name} occured! Error's message: ${err.message}`)

    } else {
      
      fs.unlink(old_path_to_csv_file + csv_file, (err) => {
        
        if (err) {
          if (err.code === 'ENOENT') {
            console.log (`${newLineChar}${csv_file} has already been removed!`);
          }

        }
        
        else console.log(`${newLineChar}${csv_file} was deleted!`);
      
      });
    
    }
  
  });

});



emitter.on("send", function FileSender (axios_config, old_path_to_csv_file, new_path_to_csv_file, csv_file) {
  
  let form = new FormData();
  
  form.append('file', fs.createReadStream(old_path_to_csv_file + csv_file));
  
  axios_config.headers = Object.assign(axios_config.headers, form.getHeaders());
  axios_config["data"] = form;
  
  axios(axios_config).then(function (response) {
    
    console.log(JSON.stringify(response.data.status));
    emitter.emit(response.data.status, old_path_to_csv_file, new_path_to_csv_file, csv_file);
  
  }).catch(function (error) {
    console.log(error);
  });

});



fs.readdir(options.directory_tree.ready_path, { withFileTypes: true }, function (error, dirents) {
  
  if (error) throw error;
  
  let ready_directory_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
  
  if (ready_directory_files.length === 0) {
    console.log(`${newLineChar}'${options.directory_tree.ready_path}' folder is empty! Nothing to process...`);
  } else {
    
    ready_directory_files.forEach(async (fileName) => {
      emitter.emit("send", config, options.directory_tree.ready_path, options.directory_tree.sent_path, fileName);
    });
  
  }

});



fs.readdir(options.directory_tree.suspended_path, { withFileTypes: true }, function (error, dirents) {
  
  if (error) throw error;
  
  let suspended_directory_files = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
  
  if (suspended_directory_files.length === 0) {
    console.log(`${newLineChar}'${options.directory_tree.suspended_path}' folder is empty! Nothing to process...`);
  } else {
    
    suspended_directory_files.forEach(async (fileName) => {
      emitter.emit("send", config, options.directory_tree.suspended_path, options.directory_tree.sent_path, fileName);
    });
  
  }

});