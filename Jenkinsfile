pipeline {
    agent any

    triggers { pollSCM('* * * * *') } //poll the source code repo every minute.

    stages {
        stage('Install Dependencies') {
            steps {
                bat "npm install"
            
            }
        }

        stage('Start Selenium Server and Run Acceptance Tests') {
            steps {
                        bat "npx webdriver-manager update"
                        bat "START /B npx webdriver-manager start"
                        bat "npm test"
            }
        post {
            always {
                publishHTML([
                    allowMissing            : false,
                    alwaysLinkToLastBuild   : false,
                    keepAll                 : false,
                    reportDir               : '.tmp/report',
                    reportFiles             : 'index.html',
                    reportName              : 'BDD Report',
                    reportTitles            : ''])

            
            }
        }
        }
    }
}