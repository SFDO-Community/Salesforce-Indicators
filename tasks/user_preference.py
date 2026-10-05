from cumulusci.core.tasks import BaseTask
from cumulusci.utils.options import CCIOptions
from cumulusci.tasks.salesforce import BaseSalesforceApiTask

class SetUserPreference(BaseSalesforceApiTask):

    class Options(CCIOptions):
        preference: str
        value: str

    def _run_task(self):
        preference = self.parsed_options.preference
        value = self.parsed_options.value
        user_id = self.org_config.user_id

        soql = (
            "SELECT Id, Value, Preference "
            "FROM UserPreference "
            f"WHERE UserId = '{user_id}' "
            f"AND ( Preference = '{preference}' OR toLabel(Preference) = '{preference}' )"
        )
        self.logger.info(soql)
        preference_rows = self.sf.query(soql)["records"]

        if len(preference_rows) > 1:
            raise RuntimeError(
                f"Expected one UserPreference, found {len(preference_rows)}"
            )

        if preference_rows:
            preference_id = preference_rows[0]["Id"]
            self.sf.UserPreference.update(
                preference_id,
                {"Value": value},
            )
            self.logger.info(
                "Updated UserPreference %s: '%s' = '%s'",
                preference_id,
                preference,
                value,
            )
            return {
                "action": "updated",
                "id": preference_id,
            }

        if preference.isnumeric():
            preference_code = preference
        else:
            soql = (
                "SELECT Value "
                "FROM PicklistValueInfo "
                f"WHERE EntityParticle.FieldDefinition.DurableId = 'UserPreference.Preference' "
                f"AND Label = '{preference}' "
            )
            preference_codes = self.sf.query(soql)["records"]

            if len(preference_codes) != 1:
                raise RuntimeError(
                    f"UserPreference ({preference}) not found"
                )

            preference_code = preference_codes[0]["Value"]

        result = self.sf.UserPreference.create(
            {
                "UserId": user_id,
                "Preference": preference_code,
                "Value": value,
            }
        )
        self.logger.info(
            "Created UserPreference %s: '%s' = '%s'",
            result["id"],
            preference,
            value,
        )
        return {
            "action": "created",
            "id": result["id"],
        }
