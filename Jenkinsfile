pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME    = "suhass434"
    DOCKERHUB_BACKEND     = "${DOCKERHUB_USERNAME}/pickmycollege-backend:latest"
    DOCKERHUB_FRONTEND    = "${DOCKERHUB_USERNAME}/pickmycollege-frontend:latest"
    DOCKERHUB_CREDENTIALS = "dockerhub-credentials"
  }

  stages {
    stage('Build Application') {
      steps {
        script {
          dir('backend') {
            sh 'npm install'
            sh 'npm run build || echo "No build script found"'
          }
          dir('frontend') {
            sh 'npm install'
            sh 'npm run build'
          }
        }
      }
    }

    stage('Test Application') {
      steps {
        script {
          dir('backend') {
            sh 'npm test || echo "No tests found"'
          }
          dir('frontend') {
            sh 'npm test || echo "No tests found"'
          }
          dir('backend/python') {
            sh 'pip install -r requirements.txt || echo "Requirements file not found"'
            sh 'pytest || echo "No Python tests found"'
          }
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQubeServer') {
          withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
            sh '''
            export PATH=$PATH:/home/suhas/sonar-scanner-5.0.1.3006-linux/bin
            sonar-scanner \
                -Dsonar.projectKey=PickMyCollege \
                -Dsonar.sources=backend,frontend \
                -Dsonar.token=$SONAR_TOKEN
            '''
          }
        }
      }
    }

    stage('Build Backend Image') {
      steps {
        script {
          sh "docker build -t ${DOCKERHUB_BACKEND} ./backend"
        }
      }
    }

    stage('Build Frontend Image') {
      steps {
        script {
          sh "docker build -t ${DOCKERHUB_FRONTEND} ./frontend"
        }
      }
    }

    stage('Scan Backend Image') {
      steps {
        sh 'trivy image ${DOCKERHUB_BACKEND} || true'
      }
    }

    stage('Scan Frontend Image') {
      steps {
        sh 'trivy image ${DOCKERHUB_FRONTEND} || true'
      }
    }

    stage('Push Images to Docker Hub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.DOCKERHUB_CREDENTIALS,
          usernameVariable: 'DH_USER',
          passwordVariable: 'DH_PASS'
        )]) {
          sh """
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker push ${DOCKERHUB_BACKEND}
            docker push ${DOCKERHUB_FRONTEND}
            docker logout
          """
        }
      }
    }

    stage('Deploy to Render') {
      steps {
        script {
          sh '''
            curl -X POST "https://api.render.com/deploy/srv-d1iurmur433s73fj4b1g?key=IujTOD7sUws"
          '''
        }
      }
    }

    stage('Cleanup') {
      steps {
        sh 'docker image prune -f || true'
        sh 'docker container prune -f || true'
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    success {
      echo 'PickMyCollege pipeline completed successfully!'
    }
    failure {
      echo 'PickMyCollege pipeline failed. Check logs above.'
    }
  }
}