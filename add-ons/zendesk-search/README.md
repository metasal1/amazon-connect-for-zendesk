# Overview and Installation
Zendesk search for Amazon Connect is an optional add-on to the [Amazon Connect app for Zendesk](https://www.zendesk.com/apps/support/amazon-connect/?q=mkp_amazon). It enables further driving the business logic of either DTMF driven (classic IVR) or conversation driven (LEX bot) contact flows, based on search results from the Zendesk Support API.

This add-on consists of a single lambda function which is called from a Connect contact flow and is passed-in parameters which contain the type of search and search values. It's possible to search users by their detected phone number (CLI), the entered user ID, custom user fields within Zendesk, the most recent open ticket for a given user, or anything else in Zendesk Support via search templates. 

You can view the  detailed installation steps [here](https://github.com/voicefoundryap/amazon-connect-for-zendesk/blob/master/add-ons/zendesk-search/Zendesk%20Search%20for%20Connect%20with%20the%20help%20of%20the%20Zendesk%20Support%20API-v2.2.pdf).

We have also provided a sample contact flow [Zendesk_SampleContactFlow] in our [GitHub repository](https://github.com/voicefoundryap/amazon-connect-for-zendesk/tree/master/contact-flows) to give you a better understanding of the search capabilities this lambda function provides.
