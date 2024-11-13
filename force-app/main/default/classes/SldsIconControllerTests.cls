@isTest
private class SldsIconControllerTests {
    
    @isTest
    static void gracefullyHandleMissingStaticResource(){
        try{
            SldsIconController.getIconOptions();
        } catch (Exception e){
            String errorMsg = e.getMessage();
            Assert.areEqual('Aura Handled Exception thrown.', errorMsg);
        }
    }

    @isTest
    static void successfullyRetrieveAndProcessStaticResource(){
 
        List<SldsIconController.Option> results = SldsIconController.getIconOptions();

        Assert.areEqual('--None--', results[0].label);
        Assert.isNull(results[0].value);
        Assert.isNull(results[0].icon);
 
    }


}