#!/bin/sh


scp ./index.html ../../../../

cd ../../../../

pwd

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

echo "> scp ./source/css/diva.css ./build/css/"
scp ./source/css/diva.css ./build/css/
fi


echo "> gulp"
gulp