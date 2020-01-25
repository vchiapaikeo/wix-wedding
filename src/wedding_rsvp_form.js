// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixData from "wix-data";
import {sendEmail} from 'backend/email.jsw';

const ATTENDING_LABEL = 'Attending';
const NOT_ATTENDING_LABEL = "Can't make it";
const NEEDS_RSVP = "Needs RSVP";

let state = {
	'queriedGuests': [],
	'userInput': {},
	'originalQuery': '',
};

$w.onReady(function () {
	// Clear out the repeater on initial load and when search results return empty
	if (state.queriedGuests.length === 0) {
		$w("#repeater1").hide();
		$w('#button3').hide();
	}

	// Bind repeater elements to fields
	$w("#repeater1").onItemReady( ($item, itemData, index) => {
		$item("#name").text = itemData.title;
		$item("#message").text = itemData.message;
		$item("#roommsg").text = itemData.rsvp_response !== NEEDS_RSVP ? itemData.room_message : '';
		$item("#rsvpresponse").text = itemData.rsvp_response;
		$item("#email").value = itemData.email;
		$item("#phone").value = itemData.phone;
		if (itemData.rsvp_response !== NEEDS_RSVP) {
			$item('#radioGroup1').selectedIndex = itemData.rsvp_response === ATTENDING_LABEL ? 0 : 1;	
		}
	}); 

	// Handle enter key press
	$w('#input1').onKeyPress((event, $w) => {
		if (event.key === "Enter") {
			const search_text = $w("#input1").value;
			search(search_text);
		}
	});
});

function scrub_to_proper_case(name_to_search) {
	return name_to_search.toLowerCase()
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
		.join(' ');
}

function query(name_to_search) {
	wixData.query("Guests2") 
		// Query the collection for any items whose "Name" field contains  
		// the value the user entered in the input element
		.eq("title", name_to_search)  // The field title is actually the name of the user
		.or(
			// Also query for partners
			wixData.query("Guests2")
				.eq("partner_name", name_to_search)
		)
		.find()  // Run the query
		.then(results => {   
			// Set the table data to be the results of the query 
			if (results.items.length === 0) {
				// If we get nothing back, nothing should be on the screen
				$w("#repeater1").hide();
				$w('#button3').hide();
				$w('#spinner').hide();
				$w('#noname').show();
			}

			// Sort the names of the users based on what was searched for
			results.items.sort((a, b) => {
				if (a.title === name_to_search && b.title !== name_to_search) {
					return -1;
				} else if (a.title !== name_to_search && b.title === name_to_search) {
					return 1;
				}
			});

			const editedToSave = {};
			for (let counter in results.items) {
				let result = results.items[counter];
				editedToSave[result._id] = {
					'_id': result._id,
					'email': result.email,
					'partner_name': result.partner_name,
					'is_family': result.is_family,
					'message': result.message,
					'title': result.title,
					'rsvp_response': result.rsvp_response,
					'did_rsvp': result.did_rsvp,
					'phone': result.phone,
					'room_message': result.room_message,
					'did_send_email': result.did_send_email,
				};
			}

			const editedToShow = results.items.map((item) => {
				if (item.is_family === 1 && item.rsvp_response === ATTENDING_LABEL) {
					item.room_message = "As a member of the family, we will handle your room booking. " + 
						"Please contact Victor Chiapaikeo or Watue Sowaprux with any questions you might have.";
				} else if (item.rsvp_response === ATTENDING_LABEL) {
					item.room_message = "Please follow this link to book your rooms at the hotel: <LINK HERE>"
				} else if (item.rsvp_response === NOT_ATTENDING_LABEL) {
					item.room_message = "Awh shucks. We're sad that you won't be able to make it but hope to see you soon next time!"
				}
				return item;
			})

			state.queriedGuests = editedToShow;
			state.userInput = editedToSave;
			$w("#repeater1").hide();
			$w("#repeater1").data = [];
			$w('#spinner').hide();

			if (results.items.length > 0) {
				$w('#noname').hide();
				$w("#repeater1").data = editedToShow;
				$w("#repeater1").show()
				$w('#button3').show();
			}

			const shouldShowSeeYaThere = should_show_see_ya_there_msg();
			if (shouldShowSeeYaThere === true) {
				$w('#seeyathere').show();
			} else {
				$w('#seeyathere').hide();
			}

			const shouldShowUpdateInstead = should_show_update_instead_of_rsvp_button();
			if (shouldShowUpdateInstead) {
				$w('#button3').label = 'Update';
			} else {
				$w('#button3').label = 'RSVP';
			}
		});
}

function search(search_text) {
	$w('#spinner').show();
	setTimeout(() => $w('#spinner').hide(), 2000);
	if (search_text === '') {
		$w("#repeater1").hide();
		$w('#button3').hide();
		$w('#noname').hide();
		return;
	}
	const search_text_scrubbed = scrub_to_proper_case(search_text);
	state.originalQuery = search_text_scrubbed;
	query(search_text_scrubbed);
}

export function button1_click(event) {
	// Runs a query on the "recipes" collection
	const search_text = $w("#input1").value;
	search(search_text);
}

export function radioGroup1_click(event) {
	let rsvp_response;
	if (event.target.selectedIndex === 0) {
		rsvp_response = ATTENDING_LABEL;
	} else if (event.target.selectedIndex === 1) {
		rsvp_response = NOT_ATTENDING_LABEL;
	}
	const itemId = event.context.additionalData.itemId;
	if (itemId in state.userInput) {
		state.userInput[itemId]['rsvp_response'] = rsvp_response;
	}
}

export function email_change(event) {
	// After user finishes writing email
	const itemId = event.context.additionalData.itemId;
	let email_response;
	email_response = event.target.value;

	if (itemId in state.userInput) {
		state.userInput[itemId]['email'] = email_response;
	}
}

export function phone_change(event) {
	const itemId = event.context.additionalData.itemId;
	let phone_response;
	phone_response = event.target.value;

	if (itemId in state.userInput) {
		state.userInput[itemId]['phone'] = phone_response;
	}
}

function do_user_input_validation() {
	let failed_validation = false;

	for (let itemId in state.userInput) {
		let userInput = state.userInput[itemId];
		if (userInput.rsvp_response === NEEDS_RSVP) {
			failed_validation = true;
		}
		if (!('email' in userInput) || userInput['email'] === '' || userInput['email'] === undefined) {
			failed_validation = true;
		}
		if (!('phone' in userInput) || userInput['phone'] === '' || userInput['phone'] === undefined) {
			failed_validation = true;
		}
	}
	return failed_validation;
}

function should_show_see_ya_there_msg() {
	let should_show = false;
	for (let itemId in state.userInput) {
		let userInput = state.userInput[itemId];
		if (userInput.rsvp_response === ATTENDING_LABEL) {
			should_show = true;
		}
	}
	return should_show;
}

function should_show_update_instead_of_rsvp_button() {
	let should_hide = true;
	for (let itemId in state.userInput) {
		let userInput = state.userInput[itemId];
		if (userInput.rsvp_response === NEEDS_RSVP) {
			should_hide = false;
		}
	}
	return should_hide;
}

export function button3_click(event) {
	// Perform update on DB based on state that we have currently
	// Do validation if users haven't entered all the fields in yet
	const failed_validation = do_user_input_validation();
	$w('#failedvalidationmsg').hide();
	if (failed_validation === true) {
		$w('#failedvalidationmsg').show();
		return;
	}
	$w('#spinner').show();
	const updatedItems = [];
	for (let itemId in state.userInput) {
		const updatedItem = {
			'_id': itemId,
			'email': state.userInput[itemId]['email'],
			'partner_name': state.userInput[itemId]['partner_name'],
			'is_family': state.userInput[itemId]['is_family'],
			'message': state.userInput[itemId]['message'],
			'title': state.userInput[itemId]['title'],
			'rsvp_response': state.userInput[itemId]['rsvp_response'],
			'phone': state.userInput[itemId]['phone'],
			'room_message': state.userInput[itemId]['room_message'],
			'did_send_email': state.userInput[itemId]['did_send_email'],
		};
		updatedItems.push(updatedItem);
	}
	wixData.bulkUpdate("Guests2", updatedItems)
		.then((results) => {
			search(state.originalQuery);

			updatedItems.forEach((item) => {
				if (item.did_send_email === 0 && item.rsvp_response === ATTENDING_LABEL && item.email !== '') {
					sendEmail(item)
						.then((result) => console.log(result))
						.catch((error) => console.warn(error));
				}
			});
			const shouldShowSeeYaThere = should_show_see_ya_there_msg();
			if (shouldShowSeeYaThere === true) {
				$w('#seeyathere').show();
			}
			const shouldShowUpdateInstead = should_show_update_instead_of_rsvp_button();
			if (shouldShowUpdateInstead) {
				$w('#button3').label = 'Update';
			}
		}).catch((err) => {
			console.warn(err);
			$w('#spinner').hide();
		});
}
