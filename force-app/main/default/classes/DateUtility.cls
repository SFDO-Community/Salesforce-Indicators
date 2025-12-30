/**
 * @description       : Utility Class for processing Indicator Date conditions
 * @author            : jeffrey-chi
 * @created date      : 11/15/24
 **/
public with sharing class DateUtility {
    public class DateConversionException extends Exception {}

    /**
     * @description       : A Relative Date converter based off the Relative Dates found in
     *                                  https://help.salesforce.com/s/articleView?id=sf.filter_dates_relative.htm&type=5
     * @author            : jeffrey-chi
 	 * @created date      : 11/15/24
     * @param relativeDate The Relative Date to be converted according to baseDate.
     * @param baseDate The Date that Relative Date will be converted relative to.
     * @return The Relative Date as a Date object.
     */
    public static Date convertRelativeDate(String relativeDate, Date baseDate) {
        String rdt = relativeDate.toLowerCase();
        Date convertedDate;

        if (rdt.containsAny('tyw')) {
            if (rdt == 'yesterday') {
                convertedDate = baseDate.addDays(-1);
            } else if (rdt == 'today') {
                convertedDate = baseDate;
            } else if (rdt == 'tomorrow') {
                convertedDate = baseDate.addDays(1);
            } else {
                // DAY
                Matcher m = Pattern.compile('^(\\D{0,4})\\s*(\\d{1,9})\\s(days.*)').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = baseDate.addDays(Integer.valueOf(m.group(2)) * -1);
                        } when 'next' {
                            convertedDate = baseDate.addDays(Integer.valueOf(m.group(2)));
                        } when '' {
                            if (m.group(3) != 'days ago') {throw new DateConversionException('Invalid relative day format');}
                            convertedDate = baseDate.addDays(Integer.valueOf(m.group(2)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative day format');
                        }
                    }
                    return convertedDate;
                }

                // WEEK
                m = Pattern.compile('^(\\D{0,4})\\s*(\\d{0,9})\\s(week.*)').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(2)) ? baseDate.toStartOfWeek().addDays(-7)
                                                                        : baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(2)) * -7));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(2)) ? baseDate.toStartOfWeek().addDays(7)
                                                                        : baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(2)) * 7));
                        } when 'this' {
                            convertedDate = baseDate.toStartOfWeek();
                        } when '' {
                            if (m.group(3) != 'weeks ago') {throw new DateConversionException('Invalid relative week format');}
                            convertedDate = baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(2)) * -7);
                        } when else {
                            throw new DateConversionException('Invalid relative week format');
                        }
                    }
                    return convertedDate;
                }

                // MONTH
                m = Pattern.compile('^(\\D{0,4})\\s*(\\d{0,9})\\s(month.*)').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(2)) ? baseDate.toStartOfMonth().addMonths(-1)
                                                                        : baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(2)) * -1));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(2)) ? baseDate.toStartOfMonth().addMonths(1)
                                                                        : baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(2))));
                        } when 'this' {
                            convertedDate = baseDate.toStartOfMonth();
                        } when '' {
                            if (m.group(3) != 'months ago') {throw new DateConversionException('Invalid relative month format');}
                            convertedDate = baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(2)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative month format');
                        }
                    }
                    return convertedDate;
                }

                // QUARTER
                m = Pattern.compile('^(\\D{0,4})\\s*(\\d{0,9})\\s(quarter.*)').matcher(rdt);
                if (m.matches()) {
                    Integer curQuarter = ((baseDate.month() - 1) / 3) + 1;
                    Date curQuarterStart = Date.newInstance(baseDate.year(), 1, 1).addMonths((curQuarter - 1) * 3);
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(2)) ? curQuarterStart.addMonths(-3)
                                                                        : curQuarterStart.addMonths(Integer.valueOf(m.group(2)) * -3));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(2)) ? curQuarterStart.addMonths(3)
                                                                        : curQuarterStart.addMonths(Integer.valueOf(m.group(2)) * 3));
                        } when 'this' {
                            convertedDate = curQuarterStart;
                        } when '' {
                            if (m.group(3) != 'quarters ago') {throw new DateConversionException('Invalid relative quarter format');}
                            convertedDate = curQuarterStart.addMonths(Integer.valueOf(m.group(2)) * -3);
                        } when else {
                            throw new DateConversionException('Invalid relative quarter format');
                        }
                    }
                    return convertedDate;
                }

                // YEAR
                m = Pattern.compile('^(\\D{0,4})\\s*(\\d{0,9})\\s(year.*)').matcher(rdt);
                if (m.matches()) {
                    Date currentYear = Date.newInstance(baseDate.year(), 1, 1);
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(2)) ? currentYear.addYears(-1)
                                                                        : currentYear.addYears(Integer.valueOf(m.group(2)) * -1));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(2)) ? currentYear.addYears(1)
                                                                        : currentYear.addYears(Integer.valueOf(m.group(2))));
                        } when 'this' {
                            convertedDate = currentYear;
                        } when '' {
                            if (m.group(3) != 'years ago') {throw new DateConversionException('Invalid relative year format');}
                            convertedDate = currentYear.addYears(Integer.valueOf(m.group(2)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative year format');
                        }
                    }
                    return convertedDate;
                }

                // TODO: FISCAL YEAR/QUARTER

                // Throw error - No format matched
                throw new DateConversionException('Invalid relative date format');
            }
            return convertedDate; 
        } else {
            throw new DateConversionException('Invalid relative date format');
        }
    }
    public static Date convertRelativeDate(String relativeDate) {
        return convertRelativeDate(relativeDate, Date.today());
    }

    /**
     * @description       : An alternative Relative Date converter based off the Relative Dates found in
     *                                  https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_dateformats.htm
     * @author            : jeffrey-chi
 	 * @created date      : 11/15/24
     * @param relativeDate The Relative Date to be converted according to baseDate.
     * @param baseDate The Date that Relative Date will be converted relative to.
     * @return The Relative Date as a Date object.
     */
    public static Date convertAltRelativeDate(String relativeDate, Date baseDate) {
        String rdt = relativeDate.toLowerCase();
        Date convertedDate;

        if (rdt.containsAny('tyw')) {
            if (rdt == 'yesterday') {
                convertedDate = baseDate.addDays(-1);
            } else if (rdt == 'today') {
                convertedDate = baseDate;
            } else if (rdt == 'tomorrow') {
                convertedDate = baseDate.addDays(1);
            } else {
                // DAY
                Matcher m = Pattern.compile('^(\\w{0,4}).*_(day[_\\w]*):*(\\d{0,9})').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.addDays(-90)
                                                                        : baseDate.addDays(Integer.valueOf(m.group(3)) * -1));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.addDays(90)
                                                                        : baseDate.addDays(Integer.valueOf(m.group(3))));
                        } when 'n' {
                            if (m.group(2) != 'days_ago') {throw new DateConversionException('Invalid relative day format');}
                            convertedDate = baseDate.addDays(Integer.valueOf(m.group(3)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative day format');
                        }
                    }
                    return convertedDate;
                }

                // WEEK
                m = Pattern.compile('^(\\w{0,4}).*_(week[_\\w]*):*(\\d{0,9})').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.toStartOfWeek().addDays(-7)
                                                                        : baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(3)) * -7));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.toStartOfWeek().addDays(7)
                                                                        : baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(3)) * 7));
                        } when 'this' {
                            convertedDate = baseDate.toStartOfWeek();
                        } when 'n' {
                            if (m.group(2) != 'weeks_ago') {throw new DateConversionException('Invalid relative week format');}
                            convertedDate = baseDate.toStartOfWeek().addDays(Integer.valueOf(m.group(3)) * -7);
                        } when else {
                            throw new DateConversionException('Invalid relative week format');
                        }
                    }
                    return convertedDate;
                }

                // MONTH
                m = Pattern.compile('^(\\w{0,4}).*_(month[_\\w]*):*(\\d{0,9})').matcher(rdt);
                if (m.matches()) {
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.toStartOfMonth().addMonths(-1)
                                                                        : baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(3)) * -1));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(3)) ? baseDate.toStartOfMonth().addMonths(1)
                                                                        : baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(3))));
                        } when 'this' {
                            convertedDate = baseDate.toStartOfMonth();
                        } when 'n' {
                            if (m.group(2) != 'months_ago') {throw new DateConversionException('Invalid relative month format');}
                            convertedDate = baseDate.toStartOfMonth().addMonths(Integer.valueOf(m.group(3)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative month format');
                        }
                    }
                    return convertedDate;
                }

                // QUARTER
                m = Pattern.compile('^(\\w{0,4}).*_(quarter[_\\w]*):*(\\d{0,9})').matcher(rdt);
                if (m.matches()) {
                    Integer curQuarter = ((baseDate.month() - 1) / 3) + 1;
                    Date curQuarterStart = Date.newInstance(baseDate.year(), 1, 1).addMonths((curQuarter - 1) * 3);
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(3)) ? curQuarterStart.addMonths(-3)
                                                                        : curQuarterStart.addMonths(Integer.valueOf(m.group(3)) * -3));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(3)) ? curQuarterStart.addMonths(3)
                                                                        : curQuarterStart.addMonths(Integer.valueOf(m.group(3)) * 3));
                        } when 'this' {
                            convertedDate = curQuarterStart;
                        } when 'n' {
                            if (m.group(2) != 'quarters_ago') {throw new DateConversionException('Invalid relative quarter format');}
                            convertedDate = curQuarterStart.addMonths(Integer.valueOf(m.group(3)) * -3);
                        } when else {
                            throw new DateConversionException('Invalid relative quarter format');
                        }
                    }
                    return convertedDate;
                }

                // YEAR
                m = Pattern.compile('^(\\w{0,4}).*_(year[_\\w]*):*(\\d{0,9})').matcher(rdt);
                if (m.matches()) {
                    Date currentYear = Date.newInstance(baseDate.year(), 1, 1);
                    switch on m.group(1) {
                        when 'last' {
                            convertedDate = (String.isBlank(m.group(3)) ? currentYear.addYears(-1)
                                                                        : currentYear.addYears(Integer.valueOf(m.group(3)) * -1));
                        } when 'next' {
                            convertedDate = (String.isBlank(m.group(3)) ? currentYear.addYears(1)
                                                                        : currentYear.addYears(Integer.valueOf(m.group(3))));
                        } when 'this' {
                            convertedDate = currentYear;
                        } when 'n' {
                            if (m.group(2) != 'years_ago') {throw new DateConversionException('Invalid relative year format');}
                            convertedDate = currentYear.addYears(Integer.valueOf(m.group(3)) * -1);
                        } when else {
                            throw new DateConversionException('Invalid relative year format');
                        }
                    }
                    return convertedDate;
                }

                // TODO: FISCAL YEAR/QUARTER

                // Throw error - No format matched
                throw new DateConversionException('Invalid relative date format');
            }
            return convertedDate; 
        } else {
            throw new DateConversionException('Invalid relative date format');
        }
    }
    public static Date convertAltRelativeDate(String relativeDate) {
        return convertAltRelativeDate(relativeDate, Date.today());
    }
}