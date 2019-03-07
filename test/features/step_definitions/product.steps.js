const { Given, When, Then, Before } = require('cucumber');
const { setWorldConstructor } = require('cucumber');
const CustomWorld = require('../support/world').World;

const actions = require('../support/actions');

const homePage = require('../page_objects/home.page');
const addProductPage = require('../page_objects/add-product.page');
const viewProductPage = require('../page_objects/view-product.page');

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

setWorldConstructor(CustomWorld);

//Cucumber before 'hook'
Before(function() {
    this.openWebsite()
});

Given('a product doesn\'t exist', function (dataTable) {
    //converts the data table from the Given statement into an object array
    var data = dataTable.hashes();
    //stores our data table object array in product
    this.product = data[0];
    //return statement tells cucumber that this step has finished
    return expect (actions.isElementOnPage(homePage.productInTable(this.product))).to.eventually.be.false;
});

When('I add the product', function () {

    //breakpoint
    debugger;
    //run 'npm run debug' open 'chrome://inspect/#devices' and click 'inspect'

    
    //clicks on the add product button on the home page (defined in the home.page.js file)
    actions.click(homePage.addProduct);
    //gives the element to type data into  (product name) and then the data to type in (this.product.name)
    actions.type(addProductPage.productName, this.product.name);
    actions.type(addProductPage.productDescription, this.product.description);
    actions.type(addProductPage.productPrice, this.product.price);

    //finishes the action by clicking the submit button
    return actions.click(addProductPage.submitButton);
});

Then('the product is created', function () {
    //checking that the productName is visible on the viewProductPage - wait for element waits for promise)
    return expect(actions.waitForElement(viewProductPage.productName(this.product))).to.eventually.be.true;
});