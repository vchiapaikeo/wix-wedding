// Filename: backend/email.jsw (web modules need to have a .jsw extension)
import sgMail from '@sendgrid/mail';
import wixData from "wix-data";
import {Buffer} from 'buffer'; 

// import ics from "ics";
const ics = require('ics');  // For some reason, can't import this normally. Ignore IDE error


function writeICSFileAndCallback(callback) {
	const event = {
		startInputType: 'utc',
		startOutputType: 'utc',
		endInputType: 'utc',
		endOutputType: 'utc',
		title: "Tue and Victor's Wedding in Phuket",
		description: 'Just another destination wedding...',
		location: ''
		url: '',
		status: 'CONFIRMED',
	};
	
	ics.createEvent(event, (error, value) => {
		if (error) {
			console.warn(error);
		}
			callback(value);
		}
	);
}

export function sendEmail(item) {
	sgMail.setApiKey('XXX');

	writeICSFileAndCallback((ics_value) => {
		// Buffer() requires a number, array or string as the first parameter, and an optional encoding type as the second parameter. 
		// Default is utf8, possible encoding types are ascii, utf8, ucs2, base64, binary, and hex
		// If we don't use toString(), JavaScript assumes we want to convert the object to utf8.
		// We can make it convert to other formats by passing the encoding type to toString().
		const ics_content_b64_encoded = Buffer.from(ics_value).toString('base64');

		const msg = {
			to: item.email,
			from: 'XXX',
			templateId: 'XXX',
			dynamic_template_data: {
				name: item.title.split(" ")[0],
				full_name: item.title,
				email: item.email,
				is_family: item.is_family ? true : false,
				point_of_contact: item.point_of_contact,
			},
			attachments: [{
				content: ics_content_b64_encoded,
				filename: 'invite.ics',
				type: 'text/calendar',
				disposition: 'attachment',
				// contentId: 'mytext'
			}],
		};
		sgMail.send(msg);

		// Mutate item to add this property so that we don't spam the user mutliple times with emails
		item['did_send_email'] = 1;
		wixData.update("Guests2", item);
	})
}
