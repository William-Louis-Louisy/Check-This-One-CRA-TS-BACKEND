import sgMail from "../middlewares/NodeMailerConfig";

interface IContactForm {
  email: string;
  subject: string;
  message: string;
}

export const sendContactEmail = async (formData: IContactForm) => {
  try {
    const msg = {
      to: process.env.EMAIL_USER,
      from: process.env.EMAIL_USER,
      replyTo: formData.email,
      subject: formData.subject,
      text: formData.message,
    };

    await sgMail.send(msg);
  } catch (error) {
    throw error;
  }
};
