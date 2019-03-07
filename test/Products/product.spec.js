const homePage = require('../page_objects/home.page');
const addProductPage = require('../page_objects/add-product.page');
const viewProductPage = require('../page_objects/view-product.page');

//Test Data: import our test data module and the 'jasmine data provider' 'using' command to handle our test data
var using = require("jasmine-data-provider");
var product = require("../data/product-data.module.js");

//Test Data: Add a 'describe'
describe("productTests", function() {
    beforeEach(function(){
        browser.get("");
    })

//Test data: add your 'using to use our test data
using(product.productInfo, function(product,description){
    it("should create a product" + description, function(){
        //should be a check that a product doesn't exist here.

        expect(homePage.productInTable(product).isDisplayed()).toBeFalsy();

        //click add products
        homePage.addProduct.click();

        //fill out form
        // Test datA: update with test data(product)
        addProductPage.productName.sendKeys(product.name);
        addProductPage.productDescription.sendKeys(product.description);
        addProductPage.productPrice.sendKeys(product.price);

        //click submit
        addProductPage.submitButton.click();

        //check product name


        //test data: update wiht test data (product)
        expect(viewProductPage.productName(product).isDisplayed()).toBeTruthy();

    });
});

});


/* beforeEach(function(){
    browser.get('');
});

it('should create a product', function(){
    //click add products

    homePage.addProduct.click();

    //fill out form

    addProductPage.productName.sendKeys("turbot");
    addProductPage.productDescription.sendKeys("fish");
    addProductPage.productPrice.sendKeys("100");

    //click submit
    addProductPage.submitButton.click()

    //check product name
    expect(viewProductPage.productName({name:"turbot"}).isDisplayed()).toBeTruthy();
}) */