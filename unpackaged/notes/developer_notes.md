# Developer Notes

These notes are for developers to track specific items for the Indicators project.

## AppExchange Security Review

More details can be found [here](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/security_review_guidelines.htm).

## Checkmarx

This should be run through a Salesforce/SFDO employee.

## Salesforce Code Analyzer (Code Scanner)

When making any changes to Apex code, always run the code scanner to find any areas of concern.

More details can be found [here](https://forcedotcom.github.io/sfdx-scanner/).

Specifically, we run the following to commands:

```
sf scanner run --format=csv --outfile=CodeAnalyzerGeneral.csv --target="./" --category="Security"
```

And we run an exclusion DFA scan

```
sf scanner run dfa --format=csv --outfile=CodeAnalyzerDFA.csv --target ".\**\*.cls,!.\**\IndicatorController.cls" --projectdir="./force-app/" --category="Security"
```

> This will run for all `.cls` files except for the `IndicatorController.cls` because it takes too long to scan.
>
> Note:  We have specifically limited the command (`scanner run dfa`) to the `force-app` directory.  This is because the `%` character used with CCI (and within NPSP) throws errors.

Then we run

```
sf scanner run dfa --format=csv --outfile=CodeAnalyzerDFA_1.csv --target="./force-app/main/default/classes/IndicatorController.cls#getNewCmdtUrls" --projectdir="./force-app" --category="Security"
```

> We needed the additional commands to specific methods in the `IndicatorController.cls` file because the command (`scanner run dfa`) runs for a longer time than the command (`scanner run`).  

And finally, we run
```
sf scanner run dfa --sfgejvmargs "-Xmx5g" --format=csv --outfile=CodeAnalyzerDFA_2.csv --target="./force-app/main/default/classes/IndicatorController.cls#getIndicatorBundle" --projectdir="./force-app" --category="Security"
```

> It's possible to hit an Out-of-Memory error, in which case it requires [increasing the Java heap space](https://forcedotcom.github.io/sfdx-scanner/en/v3.x/salesforce-graph-engine/working-with-sfge/#understand-limitreached-errors) or even [setting the target to multple files](https://forcedotcom.github.io/sfdx-scanner/en/v3.x/scanner-commands/dfa/).

📢 When the CCI design comes more aggressive, it is likely that we will need to scan the `unpackaged` directory too.
