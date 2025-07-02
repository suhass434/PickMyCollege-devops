pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME    = "suhass434"
    DOCKERHUB_BACKEND     = "${DOCKERHUB_USERNAME}/pickmycollege-backend:latest"
    DOCKERHUB_FRONTEND    = "${DOCKERHUB_USERNAME}/pickmycollege-frontend:latest"
    DOCKERHUB_CREDENTIALS = "dockerhub-credentials"
  }

  stages {
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
  }
}