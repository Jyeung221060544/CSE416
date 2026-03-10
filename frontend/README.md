source ~/.zshrc
echo $MONGODB_URI


$env:MONGODB_URI = "mongodb+srv://vivian:cse416@cse416cubs.hs1tfym.mongodb.net/cse416?appName=CSE416Cubs"
./mvnw spring-boot:run


$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:MONGODB_URI = "mongodb+srv://vivian:cse416@cse416cubs.hs1tfym.mongodb.net/cse416?appName=CSE416Cubs"
cd C:\Users\T14s\CSE416\backend
./mvnw spring-boot:run
