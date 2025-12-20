Use known or explicit CumulusCI (CCI) plans, flows, and tasks first, and if these are unclear then use the the Salesforce DX MCP server tools next and only fall back to `sf` if the MCP service is unavailable.

<detailed_sequence_of_steps>

# Setup a New Scratch Org - Detailed Sequence of Steps

Perform the steps below independently in the following order.

## 1. Confirm Org Alias
 
    ```xml
    <ask_followup_question>
        <question>Enter the org alias.
        <options>["dev", "demo", "beta", "feature"]</options>
    </ask_followup_question>
    ```

## 2. Check for Existing Org

    Check if the org already exists and is active.

## 3. Create and Deploy

    If the alias exists as a name of a Scratch Org that is NOT EXPIRED and IS ACTIVE or exists as a Connected Org, DO NOT create a new scratch org and skip to the next step.

    If the alias exists as a name of a Scratch Org and is EXPIRED or NOT ACTIVE, then create the new scratch org.

## 4. Open in Browser

    Open the org in the browser.

## 5. Set as Default

    If the org already exists but it is not the default org or the org was just created, then set it as the default org.

</detailed_sequence_of_steps>

<common_commands>

1. When you need to get the list of all configured Salesforce orgs or find out which org is the default or if a scratch org is expired.

```bash
cci org list
```

2. When checking if an org is active, review the output of `cci org list` 

The output shows: 
- A value with a "+" in the Default column indicates the org is the default. 
- A bare integer (e.g., "1") indicates the lifespan in days and the org is not active. 
- A fractional value (e.g., "16/30") indicates the org is on day 16 of a 30-day lifespan when it will expire.
- A value with a "+" in the Expired column indicates the org is expired.
- A value in the Domain further reinforces that a scratch org is active and assigned to that domain.

- Explicitly treat bare interger in Days as NOT ACTIVE and require creating or recreating the scratch org.
- Require Domain present to consider a scratch org ACTIVE.
- If alias is default (+) but NOT ACTIVE, still create.

3. Create a new scratch and deploy metadata from the CCI project. This command should not be run if an org is already active as it could cause conflicts. Confirm with user if it should be run.

Running this command takes several minutes to fully execute and the subsequent steps should not be run until this is fully completed.

Based on the alias, a different command should be run.

For `dev` or `feature` use:

```bash
cci flow run dev_org --org <alias>
```

For `demo` use:

```bash
cci flow run config_demo --org <alias>
```

For `beta` use:

```bash
cci flow run install_beta --org <alias>
```


4. Open org in browser

```bash
cci org browser <alias>
```

5. Set org as the default for the project

```bash
cci org default <alias>
```

6. Set a CCI dev hub

```xml
<ask_followup_question>
    <question>What is the alias of the dev hub?
</ask_followup_question>
```

```xml
<ask_followup_question>
    <question>Should this dev hub always be assigned for the project?
    <options>["Yes", "No"]</options>
</ask_followup_question>
```
If the dev hub should always be assigned for the project, append `--project` to the following command when running it.

```bash
cci service default devhub <alias> 
```

</common_commands>