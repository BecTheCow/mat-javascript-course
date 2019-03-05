'use strict';

import { browser } from "protractor";

var World = function World() {

    //empty test data for our product
    this.product = undefined;

    //function to open browser and go to website
    this.openWebsite = function() {

        //bug fix so that protractor works with cucumber - makes it work with non-Angular websites
        browser.waitForAngularEnabled(false);

        //opens the website
        return browser.get('');

    }
};

module.exports.World = World;