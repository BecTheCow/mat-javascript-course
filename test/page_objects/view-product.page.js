/**
 * Page object for CRUD view-product page.
 * @constructor
 */

var ViewProduct = function(){

    /**
     * Used to create the locator for the Product element (we don't know what our product name will be)
     * @param {object} product
     * @returns {ElementFinder} element
     */

     this.productName = function(product){
         return element(by.cssContainingText('h2', product.name));
     }
     
};

module.exports = new ViewProduct();