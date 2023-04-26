import { NextFunction, Request, Response } from "express";
import { sendContactEmail } from "../services/contact.services";

const ContactController = {
  // SUBMIT CONTACT FORM
  submitContactForm: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, subject, message } = req.body;

      await sendContactEmail({ email, subject, message });

      return res
        .status(200)
        .json({ message: "Contact email sent successfully" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

export default ContactController;
