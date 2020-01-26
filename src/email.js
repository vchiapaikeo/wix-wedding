// Filename: backend/email.jsw (web modules need to have a .jsw extension)
import sgMail from '@sendgrid/mail';
import wixData from "wix-data";

export function sendEmail(item) {
	sgMail.setApiKey('XXX');
	console.log(item.email);
	const msg = {
		to: item.email,
		from: 'XXX.gmail.com',
		templateId: 'XXX',
		dynamic_template_data: {
			name: item.title,
			email: item.email,
		},
	};
	sgMail.send(msg);
	
	// Mutate item to add this property so that we don't spam the user mutliple times with emails
	item['did_send_email'] = 1;
	wixData.update("Guests2", item);
}
