#!/bin/sh


scp ./index.html ../../../../

mkdir build
mkdir build/css
echo "> scp ./source/css/diva.css ./build/css/"
scp ./diva.css ../../../../build/css/

cd ../../../../

pwd

echo "Building this project requires npm, gulp and webpack. You can install these with homebrew."
read -p "Would you like to install homebrew? y/n " BREW

if [ "$BREW" = "y" ]
then
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
echo "



"
fi


read -p "Would you like to install npm? y/n " NPM

if [ "$NPM" = "y" ]
then
brew install npm
echo "



"
fi


read -p "Would you like to install webpack? y/n " WEBPACK

if [ "$WEBPACK" = "y" ]
then
brew install webpack
echo "



"
fi


read -p "Would you like to install gulp? y/n " GULP
if [ "$GULP" = "y" ]
then
brew install gulp
echo "



"
fi


read -p "Build project? y/n " BREW

if [ "$BREW" = "y" ]
then
echo "> npm install"
npm install

echo "> npm install -g gulp webpack"
npm install -g gulp webpack
echo "



"
fi

read -p "Compile and run on http://localhost:9001/ (You might get a JSHint failed message, that should be ok, Diva will be still running)? y/n " RUN

if [ "$RUN" = "y" ]
then
echo "> gulp"
gulp
fi


