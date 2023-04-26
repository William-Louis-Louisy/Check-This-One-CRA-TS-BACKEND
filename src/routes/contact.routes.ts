import ContactController from "../controllers/contact.controller";

const express = require("express");
const contactRouter = express.Router();

// SUBMIT CONTACT FORM
contactRouter.post("/contact", ContactController.submitContactForm);

export default contactRouter;
