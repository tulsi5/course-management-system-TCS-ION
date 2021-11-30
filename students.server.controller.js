const mongoose = require('mongoose');

// student object created from the Schema / model
const Student = require('../models/students.server.model');
const Course = require('../models/courses.server.model');
const passport = require('passport');

//_____________________ STUDENT CRUD FUNCTIONS _________________________
module.exports.Create = function (req, res, next) {
    let student = Student(req.body);
    student.provider = 'local';
    console.log('CREATED new student:');
    console.log(student);

    student.save(err => {
        if (err) {
            console.log(err);
            return res.status(400).send({
                message: getErrorMessage(err)
            });
        } else {
            res.status(200).json(student);
        }
    })
}

module.exports.GetStudents = function (req, res, next) {

    Student.find(
        {
            // don't show the existence of admin user to public!
            studentNumber: { $ne: 1 }
        },
        // dont show password or salt!
        '-password -salt',
        (err, students) => {
            if (err) {
                return res.status(400).send({
                    message: getErrorMessage(err)
                });
            } else {
                res.status(200).json(students);
            }
        });
}

module.exports.GetStudentDetails = function (req, res, next) {
    let id = req.params.id;
    // console.log("inside controller " + id);

    Student.findOne(
        { _id: id },
        '-password -salt',
    )
        .populate('courses')
        .exec((err, student) => {
            res.json(student);
        })
}

// Update student
module.exports.UpdateStudent = function (req, res, next) {

    //  middleware doesnt work for updates, and can't use middlware for presave since server thinks we are creating duplicate student with same studentNumber
    let id = req.params.id;

    let updatedStudent = new Student(req.body);
    updatedStudent.provider = 'local';
    updatedStudent._id = id;
    updatedStudent.salt = updatedStudent.generateSalt();
    updatedStudent.password = updatedStudent.hashPassword(updatedStudent.password);


    Student.update({ _id: id }, updatedStudent, (err) => {
        if (err) {
            return res.status(400).send({
                message: getErrorMessage(err)
            });
        } else {
            res.status(200).json(updatedStudent);
        }
    });
}

//  before deleting, removes reference from every course to this student
//  Delete student
module.exports.DeleteStudent = function (req, res, next) {
    const studentId = req.params.id;

    Student.findById(studentId,
        (err, student) => {
            if (err) {
                return res.status(400).send({
                    message: getErrorMessage(err)
                });
            } else {
                //  find all courses this student is taking
                student.courses.forEach(courseId => {
                    //  drop student from each of these courses
                    Course.findByIdAndUpdate(courseId,
                        { $pull: { students: studentId } },
                        { new: true },
                        (err, updatedCourse) => {
                            if (err) {
                                return res.status(400).send({
                                    message: getErrorMessage(err)
                                });
                            } else {
                                console.log(`Successfully dropped student (#${student.studentNumber}) from course (${updatedCourse.courseCode}) ...`);
                            }
                        }
                    );
                });
            }
        }
    );

    // delete THIS student

    Student.remove({ _id: studentId }, (err) => {
        if (err) {
            return res.status(400).send({
                message: getErrorMessage(err)
            });
        } else {
            return res.status(200).json(studentId);
        }
    });
}

module.exports.EnrollInCourse = function (req, res, next) {
    const courseId = req.body.courseId;
    const studentId = req.body.studentId;

    Student.findOneAndUpdate(
        { _id: studentId },
        { $push: { courses: courseId } },
        { new: true },
        (err, s) => {
            if (err) {
                return res.status(400).send({
                    message: getErrorMessage(err)
                });
            } else {
                Course.findOneAndUpdate(
                    { _id: courseId },
                    { $push: { students: s._id } },
                    { new: true },
                    (err, c) => {
                        if (err) {
                            return res.status(400).send({
                                message: getErrorMessage(err)
                            });
                        } else {
                            console.log(`Successfully added course (${c.courseCode}) to student (#${s.studentNumber}) ...`);
                            res.json(c);
                        }
                    }
                )
            }
        }
    );
}

module.exports.DropCourse = function (req, res, next) {

    const courseId = JSON.parse(req.params.deletionObj).courseId;
    const studentId = JSON.parse(req.params.deletionObj).studentId;

    Student.findOneAndUpdate(
        { _id: studentId },
        { $pull: { courses: courseId } },
        { new: true },
        (err, s) => {
            if (err) {
                return res.status(400).send({
                    message: getErrorMessage(err)
                });
            } else {
                Course.findOneAndUpdate(
                    { _id: courseId },
                    { $pull: { students: s._id } },
                    { new: true },
                    (err, c) => {
                        if (err) {
                            return res.status(400).send({
                                message: getErrorMessage(err)
                            });
                        } else {
                            console.log(`Successfully dropped course (${c.courseCode}) from student (#${s.studentNumber}) ...`);
                            res.json(c);
                        }
                    }
                )
            }
        }
    );
};

module.exports.Login = function (req, res, next) {
    passport.authenticate('local', (err, student, info) => {
        // res.send(JSON.stringify(info)).status(200)

        if (err || !student) {
            res.status(400).send(info);
        } else {
            // Use the Passport 'login' method to login
            req.login(student, (err) => {
                if (err) {
                    res.status(400).send(err);
                } else {
                    console.log(`${student.firstName} ${student.lastName} (#${student.studentNumber}) has logged into the system...`);
                    res.json(student);
                }
            });
        }
    })(req, res, next);
}

// HELPER FUNCTIONS 
function getErrorMessage(err) {
    let message = '';
    if (err.code) {
        switch (err.code) {
            case 11000:
            case 11001:
                message = 'Student number already exists';
                break;
            default:
                message = 'Something went wrong';
        }
    } else {
        // mongoose validation error
        if (err.errors) {
            for (let errName in err.errors) {
                if (err.errors[errName].message)
                    message = err.errors[errName].message;
            }
        } else {
            message = 'Unknown server error';
        }
    }
    return message;
};
