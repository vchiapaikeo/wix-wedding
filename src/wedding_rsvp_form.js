// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixData from "wix-data";
import wixWindow from 'wix-window';
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
        $w('#buttonRsvp').hide();
    }

    // Bind repeater elements to fields
    $w("#repeater1").onItemReady( ($item, itemData, index) => {
        $item("#name").text = itemData.title;
        $item("#message").text = itemData.message;
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

    // Finally, show the Search slide after the page loads up
    show_search()
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
                console.log('No results found...')
                $w('#noname').show();
                return;
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
                    'point_of_contact': result.point_of_contact,
                };
            }

            const editedToShow = results.items;
            state.queriedGuests = editedToShow;
            state.userInput = editedToSave;

            if (results.items.length > 0) {
                $w("#repeater1").data = [];
                $w("#repeater1").data = editedToShow;
                show_people();
            }

            const shouldShowUpdateInstead = should_show_update_instead_of_rsvp_button();
            if (shouldShowUpdateInstead) {
                  $w('#buttonRsvp').label = 'Update';
            } else {
                  $w('#buttonRsvp').label = 'RSVP';
            }
        });
}

function search(search_text) {
    if (search_text === '') {
        $w("#repeater1").hide();
        $w('#buttonRsvp').hide();
        return;
    }
    const search_text_scrubbed = scrub_to_proper_case(search_text);
    state.originalQuery = search_text_scrubbed;
    query(search_text_scrubbed);
}


// THE FOLLOWING FUNCTIONS ALLOW US TO NAVIGATE BETWEEN SLIDES
function show_search() {
    $w('#slideshow1').changeSlide(0);
    $w('#repeater1').hide();
    $w('#buttonRsvp').hide();
    $w('#fammsg').hide();
    $w('#seeyathere').hide();
    $w('#failedvalidationmsg').hide();
    $w('#noname').hide();
    wixWindow.scrollTo(0, 0);
}

function show_people() {
    $w('#slideshow1').changeSlide(1);
    $w('#repeater1').show();
    $w('#buttonRsvp').show();
    $w('#fammsg').hide();
    $w('#seeyathere').hide();
    $w('#failedvalidationmsg').hide();
    $w('#noname').hide();
    wixWindow.scrollTo(0, 0);
}

function show_confirmation(is_at_least_one_going, is_family, point_of_contact) {
    $w('#slideshow1').changeSlide(2);
    $w('#repeater1').hide();
    $w('#buttonRsvp').hide();
    $w('#fammsg').hide();
    if (is_at_least_one_going) {
        $w('#seeyathere').show();
    } else {
        $w('#seeyanexttime').show();
    }

    const poc = point_of_contact === null || point_of_contact === undefined ? 'us' : point_of_contact;
    if (is_family) {
        $w('#fammsg').text = (
            `Also, as a member of the family, we'll handle your room booking. ` +
            `Please contact ${poc} if you have any questions regarding the arrangements.`
        );
    } else {
        $w('#fammsg').text = (
            `Please navigate to this link to reserve your room. <INSERT LINK HERE>. `
            `Also, please feel free to contact ${poc} for any help with booking your arrangements.`
        );
    }

    $w('#fammsg').show();
    $w('#failedvalidationmsg').hide();
    $w('#noname').hide();
    wixWindow.scrollTo(0, 0);
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
        if (userInput.rsvp_response === ATTENDING_LABEL) {
            if (!('email' in userInput) || userInput['email'] === '' || userInput['email'] === undefined) {
                failed_validation = true;
            }
            if (!('phone' in userInput) || userInput['phone'] === '' || userInput['phone'] === undefined) {
                failed_validation = true;
            }
        }
    }
    return failed_validation;
}

function is_at_least_one_attending() {
    let at_least_one = false;
    for (let itemId in state.userInput) {
        let userInput = state.userInput[itemId];
        if (userInput.rsvp_response === ATTENDING_LABEL) {
            at_least_one = true;
        }
    }
    return at_least_one;
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

function is_at_least_one_family() {
    let is_family = false;
    for (let itemId in state.userInput) {
        let userInput = state.userInput[itemId];
        if (userInput.is_family) {
            is_family = true;
        }
    }
    return is_family;
}


export function buttonSearch_click(event) {
    const search_text = $w("#input1").value;
    search(search_text);
}

export function buttonRsvp_click(event) {
    // Perform update on DB based on state that we have currently
    // Do validation if users haven't entered all the fields in yet
    const failed_validation = do_user_input_validation();
    $w('#failedvalidationmsg').hide();
    if (failed_validation === true) {
        console.log('Failed validation!');
        $w('#failedvalidationmsg').show();
        $w('#buttonRsvp').scrollTo();
        return;
    }

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
            'point_of_contact': state.userInput[itemId]['point_of_contact'],
        };
        updatedItems.push(updatedItem);
    }

    wixData.bulkUpdate("Guests2", updatedItems)
        .then((results) => {
            updatedItems.forEach((item) => {
                if (item.did_send_email === 0 && item.rsvp_response === ATTENDING_LABEL && item.email !== '') {
                    sendEmail(item)
                        .then((result) => console.log(result))
                        .catch((error) => console.warn(error));
                }
            });
            const isAtLeastOneAttending = is_at_least_one_attending();
            const isAtLeastOneFamily = is_at_least_one_family();
            show_confirmation(isAtLeastOneAttending, isAtLeastOneFamily, updatedItems[0].point_of_contact);
        }).catch((err) => {
            console.warn(err);
        });
}
