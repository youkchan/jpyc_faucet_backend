#!/bin/bash

if [ $# -ne 1 ]; then
  echo "no parameter"
  exit 1
fi

env=$1
case "$env" in
    [p]*)
    echo "production env." ;
        cp "./.env.prod" "./.env"
        ;;
    [s]*)
    echo "stage env." ;
        cp "./.env.stage" "./.env"
        ;;

    [l]*)
    echo "local env" ;
        cp "./.env.local" "./.env"
        ;;

esac
