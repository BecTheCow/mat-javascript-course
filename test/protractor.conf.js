var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    baseUrl: 'http://localhost:8080/',

    capabilities:{
        browserName: 'chrome',

        //chromeOptions: {
         //   args: [ "--headless", "--disable-gpu", "--window-size=800,600"]

        
    },

    specs: ['products/*.spec.js'],
    suites: {
        products: 'products/*.spec.js'
    },
    
    framework: 'jasmine',
    onPrepare: function(){
        //Add a screenshot reporter and store screenshots to '/tmp/screenshots':
        jasmine.getEnv().addReporter(new HtmlReporter({
            baseDirectory: 'tmp/screenshots',
            docTitle: 'Products Report'
        }).getJasmine2Reporter());
    },
};

 /*    framework: 'custom',
    frameworkPath: require.resolve('protractor-cucumber-framework'),

    plugins: [{
        package: 'protractor-multiple-cucumber-html-reporter-plugin',
        options:{
            //read the options part for more options
            automaticallyGenerateReport: true,
            removeExistingJsonReportFile: true
        }
    }],

    specs: [
        'features/*.feature'
    ],

    cucumberOpts: {
        require: 'features/step_definitions /*.steps.js',
        tags: false,
        format: 'json:.tmp/results.json',
        //format: 'json:results.json',
        profile: false,
        'no-source': true
    }
}; */