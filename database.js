const mongoose = require('mongoose');

//const db = mongoose.connect('mongodb://192.168.10.8:27017/SysRoz');
const db = mongoose.connect('mongodb://localhost:27017/SysRoz');

const Schema = mongoose.Schema;
const AdminSchema = new Schema({
    login: String,
    password: String,
    group: String
});

const Admin = mongoose.model('admin', AdminSchema);

module.exports = {
    dbConnect: db,
    Admin:Admin,
    login:(creds,callback)=>{
        Admin.findOne(creds).then(callback);
    }
};