# Indicators Lightning Web Component

Bring some colour and visibility to the data on your Lightning Pages. Allow users to see at a glance what this record is about and what it's status is. This component is highly customisable and can be used in many record pages. 

The icons are based off the standard Lightning Web Component [Avatar](https://developer.salesforce.com/docs/component-library/bundle/lightning-avatar/example).

# Steps

* Add the **Indicators** Component to the Lightning Record Page. 
* Enter the Settings for each Indicator
  * **Title** - Required
  * **Icon** - Requried - the icon name from [SLDS Icons](https://www.lightningdesignsystem.com/icons/) or default icons such as standard:account, standard:opportunity
  * **Icon Size** - large or medium, defaults to large
  * **Icon Shape** - circle or base (sqare), defaults to base
  * **Heading Text** - _Optional_ - the text to display above the icons
  * **Indicator Field Names** - the exact API Name of the field to display - case is important. Separated by a semicolon. 
  * **Indicator Icons** - the icon name from [SLDS Icons](https://www.lightningdesignsystem.com/icons/) or default icons such as standard:account, standard:opportunity separated by a semicolon
  * **Indicator Text Values** - the three character (max) text values to show for each icon. Separated by a semicolon. Eg enter ;; if there are 3 icons with no text.
  * **Indicator Image URLs** - the full URL of the Image to display, separated by a semicolon. Note: No quotation marks. 
  * **Incicator Hover Texts** - the text to display on hover. Keep it short. Separate by semicolons. No semicolons in the text. No wrapping allowed. 
* The Indicators should display on the Lightning Page preview as you adjust them. 
* Click **Save**
* Test a boolean field to ensure the indicator disappears if false.

  _Hint:_ Use the [configuration worksheet](https://docs.google.com/spreadsheets/d/1e-Qxi0MY9An9Hb9mHPVxFom--HCNK6xNRkWO12xRxg0/edit?usp=sharing) ([Make your own copy](https://docs.google.com/spreadsheets/d/1e-Qxi0MY9An9Hb9mHPVxFom--HCNK6xNRkWO12xRxg0/copy)), I've created to help you work out the whole component before you set it up on the page.

## Rules

* If the field is a Boolean and the value is False the Indicator will not show.
* If there is a value in *Indicator Image URLs* that image will show .
* If the field is a Boolean and there is a value in *Indicator Text Values* then that text will show. Limit this text to 3 characters max, and Uppercase. 
* If the field is a Boolean and there is no value in *Indicator Text Values* the Icon will be shown.
* If the field is a Text field the first 3 characters will show, in Uppercase.
* If there is a text value, the Icon will not be shown, but the colour will be from the icon name entered.

## Examples

Images coming soon! 

## Tips
* Create a new Boolean Formula Field - eg Is Active (Is_Active__c)
```ISPICKVAL(Status__c,"Active")```
* Create a new Text field that returns a 3 character (max) value based on Picklist values eg
```CASE(TEXT(Status__c),"Oh Hold","HLD","Waiting","WT!","Cancelled","X","ACT")```
* Create a Formula for Is High Value Donor (Is_High_Value_Donor__c) and use $$$ as the text or the green money bag icon
```npo02__TotalOppAmount__c > $CustomMetadata.ReportingSettings__mdt.HighValueDonor.Amount__c```
* To get icons in non-SLDS colours, use an external service like [DaButtonFactory](https://www.clickminded.com/button-generator/) or eg [IconS8 rounded square](https://img.icons8.com/ios-filled/50/cd0000/rounded-square.png) (replace the colour in the URL) to generate an icon with the text and download it. Add it to your Asset Library, make the image public, and grab the URL. You can use the images from the external service directly, but it may not be a good idea long term. But beware, it might look a bit crap mixing with the SLDS colours. 

# Indicator Ideas
* High Value Client / Donor
* Is Active
* Is Subscriber / Type of Subscriber
* Industry
* Is Government
* Type of Account (Client / Supplier)
* On Credit Hold!
* Has Cases
* High Rating
* Is Local (eg in your State / Country, or the opposite)
* High Value Opportunity
* Opp near Close Date
* Contract due for Renewal
* SLA Level
* Is My Opportunity / Lead / any record
* Is Email Subscriber
* Is Active Member
* Is Lapsed Member
* Is Membership Due
* Is Event Attendee
* Is Employee
* Funds in (eg Donor)
* Funds out (eg Grant Recipient)
* Contact missing key information
* Should this Contact exist? (eg has no valid information)

# Future Component Ideas

* Icons
  * Different Coloured icons for different states (eg if Is Active = false then show icon greyed out or different colour)
* Setup
  * Easier setup?
  * Setup via CMDT?
  * One click deploy button

Your ideas and your help is needed. This is my very first component so it may be a bit rough around the edges, and I welcome pull requests for suggestions on how to fix or improve it. But be kind, please. 

# History

* 2015 - Christian Carter wrote an excellent blog post on [Frostings](https://cdcarter.github.io/admin/2015/11/12/frosting) and [Progress Bars](https://cdcarter.github.io/admin/2016/02/15/progress-bar) or litle graphical elements you can use in simple formulas to enchance the visual information displayed on your Salesforce records.
* 2016 - [Weathervane App](https://github.com/bigthinks/weathervane) is released. I had to get an unmanaged package to make it work for Contracts but it was a great app and my clients really relied on seeing the colourful icons on their pages. 
* 2017 - The Winter '18 Release allowed us to [display formula fields on Related Record Components](https://success.salesforce.com/ideaView?id=08730000000Dm7sAAC).
* 2018 - I did a talk at [London's Calling](https://www.youtube.com/watch?v=JPgZKdwZMxU) about using Quick Actions which featured the Indicators I had created from formula fields. A similar talk was done a few weeks later at World Tour Sydney.
* 2018 - The [Wiki Page](https://tddprojects.atlassian.net/wiki/x/KQBHDg) to go along with that talk includes many examples on where to get cool images for your formulas, but it's not so great to be going off platform to just display a few fancy icons. 
* 2020 - I did the DEX602 Lightning Web Components course (after doing the Aura components in 2018) so decided that this component would be the first one to tackle! It is well worth doing this course. 
* 2020 - Hoping that SLDS Icons would be able to be used in Formulas now, and building upon Matt Lacey's excellent [blog posts on using SVGs in formulas](https://laceysnr.com/formula-controlled-graphics-on-salesforce-1/), I wrote another [Wiki Page](https://tddprojects.atlassian.net/wiki/x/BQCHOw) delving into this. TLDR: sort of possible, but not realy. 
* Now - This component is released.
* Future - More features to come, if you can help me with implementing some of the ideas. 

# Acknowledgements

* The coloured indicators idea came from the [Weathervane App](https://github.com/bigthinks/weathervane) by Christian Carter and Beth Breisnes which was built for Classic and uses Custom Metadata Types. It has a few more features than this Component but it is something we can build upon later. It was a fabulous app but no longer supported as both have moved on to work at Salesforce. 
* The Setup section came from Clint Chester's excellent Component, [Helpful Links Component](https://github.com/edgewatercricketclub/helpful-links-component) 
* Many members of the Salesforce community helped me with writing this Lightning Web Compoenent. I hope I have not missed anyone:
  * Matt Lacey
  * René Winkelmeyer
  * Christian Szandor Knapp
  * Clint Chester
  * James Hou
  * Kyle Crouse
* And excellent blog posts or Stack Exchange articles from:
  * SFDCFox
  * Salesforce-sas
  * Rahul Gawale
* Here is [my question on the SFSE](https://salesforce.stackexchange.com/questions/307055/simplest-way-to-display-values-from-field-names-listed-in-design-attributes) to get to the bottom of one of the hardest parts of this code.