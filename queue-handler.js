const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

const fs      = require('fs');


module.exports.TestEmptyQue = function (directory_path) {

    let emptiness = ["", "[]", "{}", "[{}]", undefined, null];

    let waiting_queue = fs.readdirSync(directory_path, { withFileTypes: true }).filter(dirent => dirent.isFile()).map(dirent => dirent.name);

    let dequeue = waiting_queue.find(function(item) {
        return /\d+_waiting.csv/.test(item)
    });

    if (emptiness.includes(JSON.stringify(waiting_queue)) || emptiness.includes(JSON.stringify(dequeue))) {
        console.log(`${newLineChar}Appropriate data for processing was not located!`);
        return false;
    }

    return dequeue
    
}