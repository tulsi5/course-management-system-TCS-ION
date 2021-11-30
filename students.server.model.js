const mongoose = require('mongoose');
//adapting student model for passport-local
const crypto = require('crypto');

// create a model class
const studentsSchema = mongoose.Schema({
    studentNumber: {
        type: Number,
        unique: true,
        required: 'Student Number is required'
    },
    password: {
        type: String,
        validate: [
            function (password) {
                return password && password.length > 6;
            }, 'Password should be longer'
        ]
    },
    //  roles for admin/student
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    // to hash the password
    salt: String,
    //strategy used to register the student
    provider: {
        type: String,
        required: 'Provider is required',
        default: 'local'
    },
    // student identifier for the authentication strategy
    // providerId: String,
    // to store the student object retrieved from OAuth providers
    // providerData: {},
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    phoneNumber: String,
    email: {
        type: String,
        match: [/.+\@.+\..+/, "Please fill a valid e-mail address"]
    },
    program: String,
    // "Use ref to allow a student document to make references to corresponding course documents"
    // We need to use array of dbref here since student can enroll in many courses
    courses: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Courses'
        }
    ]
});

// pre-save middleware to handle the hashing of your students' passwords
studentsSchema.pre('save', function (next) {
    if (this.password) {
        // creates an autogenerated pseudo-random hashing salt
        this.salt = this.generateSalt();
        this.password = this.hashPassword(this.password);//returns hashed password
    }
    next();
});

// replaces the current student password with a hashed password (more secure)
studentsSchema.methods.hashPassword = function (password) {
    return crypto.pbkdf2Sync(password, this.salt, 10000, 64, 'sha512').toString('base64');
};

// refactor to generate salt into a method
studentsSchema.methods.generateSalt = function () {
    return new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
}

// authenticates the password
studentsSchema.methods.authenticate = function (password) {
    return this.password === this.hashPassword(password);
}

module.exports = mongoose.model('Students', studentsSchema);