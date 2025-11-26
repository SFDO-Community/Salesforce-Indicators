/**
 * Created by robertwright on 10/30/23.
 */

public with sharing class MetadataDeploy implements Metadata.DeployCallback {

        public String resultMessage;

        public void handleResult(Metadata.DeployResult result,Metadata.DeployCallbackContext context) {
            if(result.status === Metadata.DeployStatus.Succeeded) {
                resultMessage = 'MetaData Deploy Succeeded';
            } else resultMessage = 'MetaData Deploy Failed';
            if(Test.isRunningTest()) System.debug(resultMessage);
        }

        public static Id upsertMetaData(Metadata.DeployContainer deployContainer) {
            MetadataDeploy callback = new MetadataDeploy();
            Id upsertId;
            if(!Test.isRunningTest()) upsertId = Metadata.Operations.enqueueDeployment(deployContainer,callback);
            return upsertId;
        }

}