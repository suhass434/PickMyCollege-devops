pipeline {
  agent any

  environment {
    DOCKER_COMPOSE_FILE   = "docker-compose.yml"
    GIT_CREDENTIALS       = "github-pat"
    DOCKERHUB_CREDENTIALS = "dockerhub-credentials"
    DOCKERHUB_BACKEND     = "suhass434/pickmycollege-backend:latest"
    DOCKERHUB_FRONTEND    = "suhass434/pickmycollege-frontend:latest"
  }

  stages {
    stage('Checkout') {
      steps {
        git credentialsId: GIT_CREDENTIALS,
            url: 'https://github.com/suhass434/PickMyCollege-devops',
            branch: 'main'
      }
    }

    stage('Build App') {
      steps {
        dir('backend') {
          sh 'npm install'
          sh 'npm run build'
        }
        dir('frontend') {
          sh 'npm install'
          sh 'npm run build'
        }
      }
    }

    // Add more stages as needed (Tests, SonarQube, Docker Build/Push, etc.)
  }
}
