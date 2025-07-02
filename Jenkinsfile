pipeline {
  agent any

  environment {
    DOCKERHUB_USERNAME    = "suhass434"
    DOCKERHUB_BACKEND     = "${DOCKERHUB_USERNAME}/pickmycollege-backend:latest"
    DOCKERHUB_FRONTEND    = "${DOCKERHUB_USERNAME}/pickmycollege-frontend:latest"
    DOCKERHUB_CREDENTIALS = "dockerhub-credentials"
  }

  stages {
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