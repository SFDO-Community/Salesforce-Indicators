@isTest
private class DateUtilityTests {

    // ======================== REGULAR CONVERTER TESTS <start>
    @isTest
    static void testRelativeDayConversions() {

        Date today = DateUtility.convertRelativeDate('TODAY');
        Date yesterday = DateUtility.convertRelativeDate('YESTERDAY');
        Date tomorrow = DateUtility.convertRelativeDate('TOMORROW');

        System.Assert.areEqual(Date.today(), today, 'Expected TODAY to be equal to today\'s date');
        System.Assert.areEqual(Date.today().addDays(-1), yesterday, 'Expected YESTERDAY to be equal to the day before today');
        System.Assert.areEqual(Date.today().addDays(1), tomorrow, 'Expected TOMORROW to be equal to the day after today');

        Integer dayCount = Integer.valueOf((Math.random() * 500));
        for(Integer i = 0; i < 10; i++) {
            String dayStr = String.valueOf(dayCount);
            Date lastN = DateUtility.convertRelativeDate('LAST ' + dayStr + ' DAYS');
            Date nextN = DateUtility.convertRelativeDate('NEXT ' + dayStr + ' DAYS');
            Date nAgo = DateUtility.convertRelativeDate(dayStr + ' DAYS AGO');

            System.Assert.areEqual(Date.today().addDays(dayCount * -1), lastN);
            // NEXT N DAYS always starts tomorrow; N only affects the range's end, not its start
            System.Assert.areEqual(Date.today().addDays(1), nextN);
            System.Assert.areEqual(Date.today().addDays(dayCount * -1), nAgo);
            
            dayCount = Integer.valueOf((Math.random() * 500));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate(String.valueOf(dayCount) + ' DAYS AHEAD');
            System.Assert.fail('Expected invalid day tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV ' + String.valueOf(dayCount) + ' DAYS');
            System.Assert.fail('Expected invalid day tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testRelativeWeekConversions() {

        Date lastWeek = DateUtility.convertRelativeDate('LAST WEEK');
        Date curWeek = DateUtility.convertRelativeDate('THIS WEEK');
        Date nextWeek = DateUtility.convertRelativeDate('NEXT WEEK');
        Date tCurWeek = Date.today().toStartOfWeek();

        System.Assert.areEqual(tCurWeek.addDays(-7), lastWeek, 'Expected LAST WEEK to be equal to the first day of previous week');
        System.Assert.areEqual(tCurWeek, curWeek, 'Expected THIS WEEK to be equal to the first day of this week');
        System.Assert.areEqual(tCurWeek.addDays(7), nextWeek, 'Expected NEXT WEEK to be equal to the first day of next week');

        Integer weekCount = Integer.valueOf((Math.random() * 100));
        for(Integer i = 0; i < 10; i++) {
            String weekStr = String.valueOf(weekCount);
            Date lastN = DateUtility.convertRelativeDate('LAST ' + weekStr + ' WEEKS');
            Date nextN = DateUtility.convertRelativeDate('NEXT ' + weekStr + ' WEEKS');
            Date nAgo = DateUtility.convertRelativeDate(weekStr + ' WEEKS AGO');

            System.Assert.areEqual(tCurWeek.addDays(weekCount * -7), lastN);
            // NEXT N WEEKS always starts next week; N only affects the range's end, not its start
            System.Assert.areEqual(tCurWeek.addDays(7), nextN);
            System.Assert.areEqual(tCurWeek.addDays(weekCount * -7), nAgo);
            
            weekCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate(String.valueOf(weekCount) + ' WEEKS AHEAD');
            System.Assert.fail('Expected invalid week tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
        try {
            Date invalid = DateUtility.convertRelativeDate('PREV ' + String.valueOf(weekCount) + ' WEEKS');
            System.Assert.fail('Expected invalid week tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testRelativeMonthConversions() {

        Date lastMonth = DateUtility.convertRelativeDate('LAST MONTH');
        Date curMonth = DateUtility.convertRelativeDate('THIS MONTH');
        Date nextMonth = DateUtility.convertRelativeDate('NEXT MONTH');
        Date tCurMonth = Date.today().toStartOfMonth();

        System.Assert.areEqual(tCurMonth.addMonths(-1), lastMonth, 'Expected LAST MONTH to be equal to the first day of previous month');
        System.Assert.areEqual(tCurMonth, curMonth, 'Expected THIS MONTH to be equal to the first day of this month');
        System.Assert.areEqual(tCurMonth.addMonths(1), nextMonth, 'Expected NEXT MONTH to be equal to the first day of next month');

        Integer monthCount = Integer.valueOf((Math.random() * 20));
        for(Integer i = 0; i < 10; i++) {
            String monthStr = String.valueOf(monthCount);
            Date lastN = DateUtility.convertRelativeDate('LAST ' + monthStr + ' MONTHS');
            Date nextN = DateUtility.convertRelativeDate('NEXT ' + monthStr + ' MONTHS');
            Date nAgo = DateUtility.convertRelativeDate(monthStr + ' MONTHS AGO');

            System.Assert.areEqual(tCurMonth.addMonths(monthCount * -1), lastN);
            // NEXT N MONTHS always starts next month; N only affects the range's end, not its start
            System.Assert.areEqual(tCurMonth.addMonths(1), nextN);
            System.Assert.areEqual(tCurMonth.addMonths(monthCount * -1), nAgo);
            
            monthCount = Integer.valueOf((Math.random() * 20));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate(String.valueOf(monthCount) + ' MONTHS AHEAD');
            System.Assert.fail('Expected invalid month tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV ' + String.valueOf(monthCount) + ' MONTHS');
            System.Assert.fail('Expected invalid month tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testRelativeQuarterConversions() {
        Date lastQuarter = DateUtility.convertRelativeDate('LAST QUARTER');
        Date curQuarter = DateUtility.convertRelativeDate('THIS QUARTER');
        Date nextQuarter = DateUtility.convertRelativeDate('NEXT QUARTER');
        Date tCurQuarter = Date.newInstance(Date.today().year(), 1, 1).addMonths((((Date.today().month() - 1) / 3)) * 3);

        System.Assert.areEqual(tCurQuarter.addMonths(-3), lastQuarter, 'Expected LAST QUARTER to be equal to the first day of previous quarter');
        System.Assert.areEqual(tCurQuarter, curQuarter, 'Expected THIS QUARTER to be equal to the first day of this quarter');
        System.Assert.areEqual(tCurQuarter.addMonths(3), nextQuarter, 'Expected NEXT QUARTER to be equal to the first day of next quarter');

        Integer quarterCount = Integer.valueOf((Math.random() * 10));
        for(Integer i = 0; i < 5; i++) {
            String quarterStr = String.valueOf(quarterCount);
            Date lastN = DateUtility.convertRelativeDate('LAST ' + quarterStr + ' QUARTERS');
            Date nextN = DateUtility.convertRelativeDate('NEXT ' + quarterStr + ' QUARTERS');
            Date nAgo = DateUtility.convertRelativeDate(quarterStr + ' QUARTERS AGO');

            System.Assert.areEqual(tCurQuarter.addMonths(quarterCount * -3), lastN);
            // NEXT N QUARTERS always starts next quarter; N only affects the range's end, not its start
            System.Assert.areEqual(tCurQuarter.addMonths(3), nextN);
            System.Assert.areEqual(tCurQuarter.addMonths(quarterCount * -3), nAgo);
            
            quarterCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate(String.valueOf(quarterCount) + ' QUARTERS AHEAD');
            System.Assert.fail('Expected invalid quarter tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV ' + String.valueOf(quarterCount) + ' QUARTERS');
            System.Assert.fail('Expected invalid quarter tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testRelativeYearConversions() {
        Date lastYear = DateUtility.convertRelativeDate('LAST YEAR');
        Date curYear = DateUtility.convertRelativeDate('THIS YEAR');
        Date nextYear = DateUtility.convertRelativeDate('NEXT YEAR');
        Date tCurYear = Date.newInstance(Date.today().year(), 1, 1);

        System.Assert.areEqual(tCurYear.addYears(-1), lastYear, 'Expected LAST YEAR to be equal to the first day of previous year');
        System.Assert.areEqual(tCurYear, curYear, 'Expected THIS YEAR to be equal to the first day of this year');
        System.Assert.areEqual(tCurYear.addYears(1), nextYear, 'Expected NEXT YEAR to be equal to the first day of next year');

        Integer yearCount = Integer.valueOf((Math.random() * 5));
        for(Integer i = 0; i < 5; i++) {
            String yearStr = String.valueOf(yearCount);
            Date lastN = DateUtility.convertRelativeDate('LAST ' + yearStr + ' YEARS');
            Date nextN = DateUtility.convertRelativeDate('NEXT ' + yearStr + ' YEARS');
            Date nAgo = DateUtility.convertRelativeDate(yearStr + ' YEARS AGO');

            System.Assert.areEqual(tCurYear.addYears(yearCount * -1), lastN);
            // NEXT N YEARS always starts next year; N only affects the range's end, not its start
            System.Assert.areEqual(tCurYear.addYears(1), nextN);
            System.Assert.areEqual(tCurYear.addYears(yearCount * -1), nAgo);
            
            yearCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate(String.valueOf(yearCount) + ' YEARS AHEAD');
            System.Assert.fail('Expected invalid year tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV ' + String.valueOf(yearCount) + ' YEARS');
            System.Assert.fail('Expected invalid year tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testInvalidRelativeYearConversions() {
        try {
            Date invalid = DateUtility.convertRelativeDate('This is a normal string');
            System.Assert.fail('Expected invalid relative date to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('aaaaaaaaaaa');
            System.Assert.fail('Expected invalid relative date to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }
    // ======================== REGULAR CONVERTER TESTS <end>

    // ======================== SOQL SYNTAX TESTS <start>
    // convertAltRelativeDate was removed (it was an unused alias) once convertRelativeDate's regex
    // started natively accepting both formats. These tests keep coverage of the underscore/colon syntax.
    @isTest
    static void testSoqlSyntaxDayConversions() {

        Date today = DateUtility.convertRelativeDate('TODAY');
        Date yesterday = DateUtility.convertRelativeDate('YESTERDAY');
        Date tomorrow = DateUtility.convertRelativeDate('TOMORROW');
        Date last90 = DateUtility.convertRelativeDate('LAST_90_DAYS');
        Date next90 = DateUtility.convertRelativeDate('NEXT_90_DAYS');

        System.Assert.areEqual(Date.today(), today, 'Expected TODAY to be equal to today\'s date');
        System.Assert.areEqual(Date.today().addDays(-1), yesterday, 'Expected YESTERDAY to be equal to the day before today');
        System.Assert.areEqual(Date.today().addDays(1), tomorrow, 'Expected TOMORROW to be equal to the day after today');
        System.Assert.areEqual(Date.today().addDays(-90), last90, 'Expected LAST_90_DAYS to be equal to 90 days before today');
        // NEXT_90_DAYS always starts tomorrow; the count only affects the range's end, not its start
        System.Assert.areEqual(Date.today().addDays(1), next90, 'Expected NEXT_90_DAYS to be equal to the day after today');

        Integer dayCount = Integer.valueOf((Math.random() * 500));
        for(Integer i = 0; i < 10; i++) {
            String dayStr = String.valueOf(dayCount);
            Date lastN = DateUtility.convertRelativeDate('LAST_N_DAYS:' + dayStr);
            Date nextN = DateUtility.convertRelativeDate('NEXT_N_DAYS:' + dayStr);
            Date nAgo = DateUtility.convertRelativeDate('N_DAYS_AGO:' + dayStr);

            System.Assert.areEqual(Date.today().addDays(dayCount * -1), lastN);
            // NEXT N DAYS always starts tomorrow; N only affects the range's end, not its start
            System.Assert.areEqual(Date.today().addDays(1), nextN);
            System.Assert.areEqual(Date.today().addDays(dayCount * -1), nAgo);

            dayCount = Integer.valueOf((Math.random() * 500));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('N_DAYS_AHEAD:' + String.valueOf(dayCount));
            System.Assert.fail('Expected invalid day tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV_N_DAYS:' + String.valueOf(dayCount));
            System.Assert.fail('Expected invalid day tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testSoqlSyntaxWeekConversions() {

        Date lastWeek = DateUtility.convertRelativeDate('LAST_WEEK');
        Date curWeek = DateUtility.convertRelativeDate('THIS_WEEK');
        Date nextWeek = DateUtility.convertRelativeDate('NEXT_WEEK');
        Date tCurWeek = Date.today().toStartOfWeek();

        System.Assert.areEqual(tCurWeek.addDays(-7), lastWeek, 'Expected LAST_WEEK to be equal to the first day of previous week');
        System.Assert.areEqual(tCurWeek, curWeek, 'Expected THIS_WEEK to be equal to the first day of this week');
        System.Assert.areEqual(tCurWeek.addDays(7), nextWeek, 'Expected NEXT_WEEK to be equal to the first day of next week');

        Integer weekCount = Integer.valueOf((Math.random() * 100));
        for(Integer i = 0; i < 10; i++) {
            String weekStr = String.valueOf(weekCount);
            Date lastN = DateUtility.convertRelativeDate('LAST_N_WEEKS:' + weekStr);
            Date nextN = DateUtility.convertRelativeDate('NEXT_N_WEEKS:' + weekStr);
            Date nAgo = DateUtility.convertRelativeDate('N_WEEKS_AGO:' + weekStr);

            System.Assert.areEqual(tCurWeek.addDays(weekCount * -7), lastN);
            // NEXT N WEEKS always starts next week; N only affects the range's end, not its start
            System.Assert.areEqual(tCurWeek.addDays(7), nextN);
            System.Assert.areEqual(tCurWeek.addDays(weekCount * -7), nAgo);

            weekCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('N_WEEKS_AHEAD:' + String.valueOf(weekCount));
            System.Assert.fail('Expected invalid week tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
        try {
            Date invalid = DateUtility.convertRelativeDate('PREV_N_WEEKS:' + String.valueOf(weekCount));
            System.Assert.fail('Expected invalid week tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testSoqlSyntaxMonthConversions() {

        Date lastMonth = DateUtility.convertRelativeDate('LAST_MONTH');
        Date curMonth = DateUtility.convertRelativeDate('THIS_MONTH');
        Date nextMonth = DateUtility.convertRelativeDate('NEXT_MONTH');
        Date tCurMonth = Date.today().toStartOfMonth();

        System.Assert.areEqual(tCurMonth.addMonths(-1), lastMonth, 'Expected LAST_MONTH to be equal to the first day of previous month');
        System.Assert.areEqual(tCurMonth, curMonth, 'Expected THIS_MONTH to be equal to the first day of this month');
        System.Assert.areEqual(tCurMonth.addMonths(1), nextMonth, 'Expected NEXT_MONTH to be equal to the first day of next month');

        Integer monthCount = Integer.valueOf((Math.random() * 20));
        for(Integer i = 0; i < 10; i++) {
            String monthStr = String.valueOf(monthCount);
            Date lastN = DateUtility.convertRelativeDate('LAST_N_MONTHS:' + monthStr);
            Date nextN = DateUtility.convertRelativeDate('NEXT_N_MONTHS:' + monthStr);
            Date nAgo = DateUtility.convertRelativeDate('N_MONTHS_AGO:' + monthStr);

            System.Assert.areEqual(tCurMonth.addMonths(monthCount * -1), lastN);
            // NEXT N MONTHS always starts next month; N only affects the range's end, not its start
            System.Assert.areEqual(tCurMonth.addMonths(1), nextN);
            System.Assert.areEqual(tCurMonth.addMonths(monthCount * -1), nAgo);

            monthCount = Integer.valueOf((Math.random() * 20));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('N_MONTHS_AHEAD:' + String.valueOf(monthCount));
            System.Assert.fail('Expected invalid month tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV_N_MONTHS:' + String.valueOf(monthCount));
            System.Assert.fail('Expected invalid month tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testSoqlSyntaxQuarterConversions() {
        Date lastQuarter = DateUtility.convertRelativeDate('LAST_QUARTER');
        Date curQuarter = DateUtility.convertRelativeDate('THIS_QUARTER');
        Date nextQuarter = DateUtility.convertRelativeDate('NEXT_QUARTER');
        Date tCurQuarter = Date.newInstance(Date.today().year(), 1, 1).addMonths((((Date.today().month() - 1) / 3)) * 3);

        System.Assert.areEqual(tCurQuarter.addMonths(-3), lastQuarter, 'Expected LAST_QUARTER to be equal to the first day of previous quarter');
        System.Assert.areEqual(tCurQuarter, curQuarter, 'Expected THIS_QUARTER to be equal to the first day of this quarter');
        System.Assert.areEqual(tCurQuarter.addMonths(3), nextQuarter, 'Expected NEXT_QUARTER to be equal to the first day of next quarter');

        Integer quarterCount = Integer.valueOf((Math.random() * 10));
        for(Integer i = 0; i < 5; i++) {
            String quarterStr = String.valueOf(quarterCount);
            Date lastN = DateUtility.convertRelativeDate('LAST_N_QUARTERS:' + quarterStr);
            Date nextN = DateUtility.convertRelativeDate('NEXT_N_QUARTERS:' + quarterStr);
            Date nAgo = DateUtility.convertRelativeDate('N_QUARTERS_AGO:' + quarterStr);

            System.Assert.areEqual(tCurQuarter.addMonths(quarterCount * -3), lastN);
            // NEXT N QUARTERS always starts next quarter; N only affects the range's end, not its start
            System.Assert.areEqual(tCurQuarter.addMonths(3), nextN);
            System.Assert.areEqual(tCurQuarter.addMonths(quarterCount * -3), nAgo);

            quarterCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('N_QUARTERS_AHEAD:' + String.valueOf(quarterCount));
            System.Assert.fail('Expected invalid quarter tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV_N_QUARTERS:' + String.valueOf(quarterCount));
            System.Assert.fail('Expected invalid quarter tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testSoqlSyntaxYearConversions() {
        Date lastYear = DateUtility.convertRelativeDate('LAST_YEAR');
        Date curYear = DateUtility.convertRelativeDate('THIS_YEAR');
        Date nextYear = DateUtility.convertRelativeDate('NEXT_YEAR');
        Date tCurYear = Date.newInstance(Date.today().year(), 1, 1);

        System.Assert.areEqual(tCurYear.addYears(-1), lastYear, 'Expected LAST_YEAR to be equal to the first day of previous year');
        System.Assert.areEqual(tCurYear, curYear, 'Expected THIS_YEAR to be equal to the first day of this year');
        System.Assert.areEqual(tCurYear.addYears(1), nextYear, 'Expected NEXT_YEAR to be equal to the first day of next year');

        Integer yearCount = Integer.valueOf((Math.random() * 5));
        for(Integer i = 0; i < 5; i++) {
            String yearStr = String.valueOf(yearCount);
            Date lastN = DateUtility.convertRelativeDate('LAST_N_YEARS:' + yearStr);
            Date nextN = DateUtility.convertRelativeDate('NEXT_N_YEARS:' + yearStr);
            Date nAgo = DateUtility.convertRelativeDate('N_YEARS_AGO:' + yearStr);

            System.Assert.areEqual(tCurYear.addYears(yearCount * -1), lastN);
            // NEXT N YEARS always starts next year; N only affects the range's end, not its start
            System.Assert.areEqual(tCurYear.addYears(1), nextN);
            System.Assert.areEqual(tCurYear.addYears(yearCount * -1), nAgo);

            yearCount = Integer.valueOf((Math.random() * 100));
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('N_YEARS_AHEAD:' + String.valueOf(yearCount));
            System.Assert.fail('Expected invalid year tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('PREV_N_YEARS:' + String.valueOf(yearCount));
            System.Assert.fail('Expected invalid year tag to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }

    @isTest
    static void testInvalidSoqlSyntaxRelativeDate() {
        try {
            Date invalid = DateUtility.convertRelativeDate('This is a normal string');
            System.Assert.fail('Expected invalid relative date to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }

        try {
            Date invalid = DateUtility.convertRelativeDate('aaaaaaaaaaa');
            System.Assert.fail('Expected invalid relative date to fail');
        } catch(Exception e) {
            String eName = e.getTypeName();
            System.Assert.areEqual(eName, 'DateUtility.DateConversionException', 'Expected exception of type DateUtility.DateConversionException');
        }
    }
    // ======================== SOQL SYNTAX TESTS <end>

    // ======================== DATE RANGE TESTS <start>
    @isTest
    static void testConvertRelativeDateRangeSingleDays() {
        Date today = Date.today();

        DateUtility.DateRange todayRange = DateUtility.convertRelativeDateRange('TODAY');
        System.Assert.areEqual(today, todayRange.StartDate, 'Expected TODAY to start today');
        System.Assert.areEqual(today.addDays(1), todayRange.EndDate, 'Expected TODAY to end tomorrow');

        DateUtility.DateRange yesterdayRange = DateUtility.convertRelativeDateRange('YESTERDAY');
        System.Assert.areEqual(today.addDays(-1), yesterdayRange.StartDate, 'Expected YESTERDAY to start the day before today');
        System.Assert.areEqual(today, yesterdayRange.EndDate, 'Expected YESTERDAY to end today');

        DateUtility.DateRange tomorrowRange = DateUtility.convertRelativeDateRange('TOMORROW');
        System.Assert.areEqual(today.addDays(1), tomorrowRange.StartDate, 'Expected TOMORROW to start the day after today');
        System.Assert.areEqual(today.addDays(2), tomorrowRange.EndDate, 'Expected TOMORROW to end the day after that');
    }

    @isTest
    static void testConvertRelativeDateRangeDays() {
        Date today = Date.today();

        // LAST N DAYS includes today (documented exception)
        DateUtility.DateRange lastDays = DateUtility.convertRelativeDateRange('LAST 5 DAYS');
        System.Assert.areEqual(today.addDays(-5), lastDays.StartDate);
        System.Assert.areEqual(today.addDays(1), lastDays.EndDate);

        // NEXT N DAYS starts tomorrow (custom field filter interpretation); end depends on N
        DateUtility.DateRange nextDays = DateUtility.convertRelativeDateRange('NEXT 5 DAYS');
        System.Assert.areEqual(today.addDays(1), nextDays.StartDate);
        System.Assert.areEqual(today.addDays(6), nextDays.EndDate);

        // N DAYS AGO is a single day and excludes today
        DateUtility.DateRange daysAgo = DateUtility.convertRelativeDateRange('5 DAYS AGO');
        System.Assert.areEqual(today.addDays(-5), daysAgo.StartDate);
        System.Assert.areEqual(today.addDays(-4), daysAgo.EndDate);
    }

    @isTest
    static void testConvertRelativeDateRangeWeeks() {
        Date startOfWeek = Date.today().toStartOfWeek();

        DateUtility.DateRange lastWeeks = DateUtility.convertRelativeDateRange('LAST 3 WEEKS');
        System.Assert.areEqual(startOfWeek.addDays(-21), lastWeeks.StartDate);
        System.Assert.areEqual(startOfWeek, lastWeeks.EndDate, 'Expected LAST N WEEKS to exclude the current week');

        DateUtility.DateRange nextWeeks = DateUtility.convertRelativeDateRange('NEXT 3 WEEKS');
        System.Assert.areEqual(startOfWeek.addDays(7), nextWeeks.StartDate, 'Expected NEXT N WEEKS to start next week regardless of N');
        System.Assert.areEqual(startOfWeek.addDays(28), nextWeeks.EndDate);

        DateUtility.DateRange weeksAgo = DateUtility.convertRelativeDateRange('3 WEEKS AGO');
        System.Assert.areEqual(startOfWeek.addDays(-21), weeksAgo.StartDate);
        System.Assert.areEqual(startOfWeek.addDays(-14), weeksAgo.EndDate, 'Expected N WEEKS AGO to span a single week');
    }

    @isTest
    static void testConvertRelativeDateRangeMonths() {
        Date startOfMonth = Date.today().toStartOfMonth();

        DateUtility.DateRange lastMonths = DateUtility.convertRelativeDateRange('LAST 4 MONTHS');
        System.Assert.areEqual(startOfMonth.addMonths(-4), lastMonths.StartDate);
        System.Assert.areEqual(startOfMonth, lastMonths.EndDate);

        DateUtility.DateRange nextMonths = DateUtility.convertRelativeDateRange('NEXT 4 MONTHS');
        System.Assert.areEqual(startOfMonth.addMonths(1), nextMonths.StartDate, 'Expected NEXT N MONTHS to start next month regardless of N');
        System.Assert.areEqual(startOfMonth.addMonths(5), nextMonths.EndDate);
    }

    @isTest
    static void testConvertRelativeDateRangeQuarters() {
        Date today = Date.today();
        Integer curQuarter = ((today.month() - 1) / 3) + 1;
        Date curQuarterStart = Date.newInstance(today.year(), 1, 1).addMonths((curQuarter - 1) * 3);

        DateUtility.DateRange thisQuarter = DateUtility.convertRelativeDateRange('THIS QUARTER');
        System.Assert.areEqual(curQuarterStart, thisQuarter.StartDate);
        System.Assert.areEqual(curQuarterStart.addMonths(3), thisQuarter.EndDate);

        DateUtility.DateRange nextQuarters = DateUtility.convertRelativeDateRange('NEXT 2 QUARTERS');
        System.Assert.areEqual(curQuarterStart.addMonths(3), nextQuarters.StartDate, 'Expected NEXT N QUARTERS to start next quarter regardless of N');
        System.Assert.areEqual(curQuarterStart.addMonths(9), nextQuarters.EndDate);
    }

    @isTest
    static void testConvertRelativeDateRangeYears() {
        Date currentYear = Date.newInstance(Date.today().year(), 1, 1);

        DateUtility.DateRange nextYears = DateUtility.convertRelativeDateRange('NEXT 2 YEARS');
        System.Assert.areEqual(currentYear.addYears(1), nextYears.StartDate, 'Expected NEXT N YEARS to start next year regardless of N');
        System.Assert.areEqual(currentYear.addYears(3), nextYears.EndDate);

        DateUtility.DateRange yearsAgo = DateUtility.convertRelativeDateRange('2 YEARS AGO');
        System.Assert.areEqual(currentYear.addYears(-2), yearsAgo.StartDate);
        System.Assert.areEqual(currentYear.addYears(-1), yearsAgo.EndDate, 'Expected N YEARS AGO to span a single year');
    }
    // ======================== DATE RANGE TESTS <end>
}