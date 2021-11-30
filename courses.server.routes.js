
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// student object created from the Schema / model
const Student = require('../models/students.server.model');
const Course = require('../models/courses.server.model');
const coursesController = require("../controllers/courses.server.controller");

router.route('/')
    .get((req, res, next) => coursesController.GetCourses(req, res, next))
    .post((req, res, next) => coursesController.CreateCourse(req, res, next));

router.route('/:id')
    .get((req, res, next) => coursesController.GetOneCourse(req, res, next))
    .put((req, res, next) => coursesController.UpdateCourse(req, res, next))
    .delete((req, res, next) => coursesController.DeleteCourse(req, res, next));


router.route('/getAvailable/:studentId')
    .get((req, res, next) => coursesController.GetAvailableCourses(req, res, next));


router.route('/getEnrolled/:studentId')
    .get((req, res, next) => coursesController.GetEnrolledCourses(req, res, next));


router.route('/getNotEnrolledStudents/:courseId')
    .get((req, res, next) => coursesController.GetNotEnrolledStudents(req, res, next));

module.exports = router;