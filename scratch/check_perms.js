const mongoose = require('mongoose');

async function check() {
    try {
        const uri = 'mongodb+srv://paintshop466_db_user:010203040506@cluster0.uzsyt5y.mongodb.net/vero?appName=Cluster0';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const Permission = mongoose.model('Permission', new mongoose.Schema({}, { strict: false }));
        const UserPermission = mongoose.model('UserPermission', new mongoose.Schema({}, { strict: false }));

        const adminRolePerms = await Permission.find({ role: 'admin' }).lean();
        console.log('=== ADMIN ROLE PERMISSIONS IN DB ===');
        console.log(JSON.stringify(adminRolePerms, null, 2));

        const userPerms = await UserPermission.find({}).lean();
        console.log('=== USER PERMISSIONS IN DB ===');
        console.log(JSON.stringify(userPerms, null, 2));

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

check();
