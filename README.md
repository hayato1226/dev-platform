# dev-platform

開発を便利にするプラットフォームの試作

# DEMO

- backend server demo
  ![backend demo](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/88184/50ca4cbd-422c-8176-a3a4-f1a8b9cd3c70.gif)

- frontend server demo
  ![frontend demo](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/88184/1b0a39bc-dbe2-9b87-19d8-e19ed9b39f30.gif)

# Features

Pulumi による構成管理を、外部 API や WebUI を通じて呼び出せるようにしたものです。サンプルとして Android 端末を作成できるようにしています。
Pulumi Automation API によって、Pulumi の構成管理機能を Express から呼び出すことで実現しています。

# Requirement

- pulumi client
- nodejs
- pulumi account
- AWS account

# Installation

- pulumi client

  - https://www.pulumi.com/docs/get-started/aws/begin/

- npdejs
  - https://nodejs.org/en/download/package-manager/

# Usage

- start backend server

```bash
git clone https://github.com/hayato1226/dev-platform.git
cd dev-platform/backend
pulumi login
export AWS_PROFILE=<your-profile-name>
npm start
```

Launch at port 3001

- start frontend server

```bash
git clone https://github.com/hayato1226/dev-platform.git
cd dev-platform/frontend
npm start
```

Launch at port 3000

# Author

Hayato Yasuhisa

# License

under [MIT license](https://en.wikipedia.org/wiki/MIT_License).
