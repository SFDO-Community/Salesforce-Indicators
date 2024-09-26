// TODO: set "display logic" to only show appropriate filters based on field type
// TODO: incorporate all data from saved Indicator Item metadata
// TODO: fix lag on combobox load
// TODO: add re-ordering of variants (drag/drop or arrows)

import { LightningElement, api, track, wire } from 'lwc';
import getSldsIcons from '@salesforce/apex/SldsIconController.getIconOptions';

// Icons last updated 9/24/2024
const ICONS = {
    utility: 'activity,ad_set,add_above,add_below,add_source,add,adduser,adjust_value,advanced_function,advertising,agent_home,agent_session,aggregate,aggregation_policy,alert,all,anchor,angle,animal_and_nature,announcement,answer,answered_twice,anywhere_alert,anywhere_chat,apex_alt,apex_plugin,apex,app_web_messaging,approval,apps,archive,array,arrow_bottom,arrow_left,arrow_right,arrow_top,arrowdown,arrowup,asset_audit,asset_object,asset_repossessed,asset_warranty,assignment,attach,automate,away,back,ban,block_visitor,bold,bookmark_alt,bookmark_stroke,bookmark,bottom_align,bottom_group_alignment,breadcrumbs,broadcast,brush,bucket,budget_category_value,budget_period,bug,builder,bundle_config,bundle_policy,button_choice,buyer_group_qualifier,calculated_insights,call,campaign,cancel_file_request,cancel_transfer,cant_sync,capacity_plan,capslock,captions,card_details,cart,case,cases,center_align_text,center_align,center_group_alignment,change_owner,change_record_type,change_request,chart,chat,check,checkin,checkout,chevrondown,chevronleft,chevronright,chevronup,choice,circle,classic_interface,clear,clock,close,cms,collapse_all,collection_alt,collection_variable,collection,color_swatch,columns,comments,company,component_customization,connected_apps,constant,contact_request,contact,contactless_pay,contract_alt,contract_doc,contract_line_outcome_data,contract_line_outcome,contract_payment,contract,copy_to_clipboard,copy,coupon_codes,crossfilter,currency_input,currency,custom_apps,customer_workspace,customer,cut,dash,data_cloud,data_graph,data_mapping,data_model,data_transforms,database,datadotcom,date_input,date_time,dayview,delete,deprecate,description,desktop_and_phone,desktop_console,desktop,detach,dialing,diamond,discounts,dislike,display_rich_text,display_text,dock_panel,document_preview,down,download,drag_and_drop,drag,duration_downscale,dynamic_record_choice,edit_form,edit_gpt,edit,education,einstein_alt,einstein,email_open,email,emoji,end_call,end_chat,end_messaging_session,engage,enter,entitlement,erect_window,error,event_ext,event,events,expand_all,expand_alt,expand,expired,fallback,favorite_alt,favorite,feed,field_sales,file,filter_criteria_rule,filter_criteria,filter,filterList,flow_alt,flow,food_and_drink,form,format,formula,forward_up,forward,freeze_column,frozen,fulfillment_order,full_width_view,fully_synced,funding_award_adjustment,funding_requirement,global_constant,graph,groups,guidance,hazmat_equipment,heart,height,help_center,help_doc_ext,help,hide_mobile,hide,hierarchy,high_velocity_sales,highlight,holiday_operating_hours,home,hourglass,http,identity,image,in_app_assistant,inbox,incident,incoming_call,indicator_performance_period,info_alt,info,inner_join,insert_tag_field,insert_template,inspector_panel,integration,internal_share,italic,join,jump_to_bottom,jump_to_left,jump_to_right,jump_to_top,justify_text,kanban,key_dates,key,keyboard_dismiss,keypad,knowledge_base,knowledge_smart_link,label,labels,layers,layout_banner,layout_card,layout_overlap,layout_tile,layout,lead,leave_conference,left_align_text,left_align,left_join,left,level_down,level_up,light_bulb,lightning_extension,lightning_inspector,like,line_chart,link,linked,list,listen,live_message,location_permit,location,lock,locked_with_additions,locker_service_api_viewer,locker_service_console,log_a_call,logout,loop,lower_flag,macros,magicwand,maintenance_plan,mark_all_as_read,market,matrix,meet_content_source,meet_focus_content,meet_focus_equal,meet_focus_presenter,meet_present_panel,merge_field,merge,metrics,middle_align,minimize_window,missed_call,mixed_sources_mapping,money,moneybag,monthlyview,more,move,mulesoft,multi_picklist,multi_select_checkbox,muted,new_direct_message,new_window,new,news,no_return,not_in_sync,not_saved,note,notebook,notification_off,notification_snoozed,notification,number_input,office365,offline_briefcase,offline_cached,offline,omni_channel,open_folder,open,opened_folder,opportunity,orchestrator,orders,org_chart,outbound_call,outcome,outer_join,output,overflow,package_org_beta,package_org,package,page_structure,page,palette,password,paste,path_experiment,pause_alt,pause,payment_deferred,payment_gateway,pdf_ext,people,percent,phone_landscape,phone_portrait,photo,picklist_choice,picklist_type,picklist,pin,pinned,plane,planning_poker,play,podcast_webinar,pop_in,power,preview,price_book_entries,price_books,pricing_workspace,print,priority,privately_shared,problem,process,product_consumed_state,product_quantity_rules,product_service_campaign_item,product_service_campaign,product_transfer_state,product_transfer,product_warranty_term,product_workspace,product,products,profile_alt,profile,program_cohort_member,program_cohort,promotion_segments,promotion_tiers,promotions_workspace,promotions,prompt_builder,prompt_edit,prompt,propagation_policy,proposition,push,puzzle,qualifications,question_mark,question,questions_and_answers,queue,quick_text,quip,quotation_marks,quote,radio_button,rating,real_time,reassign,recipe,record_alt,record_collection,record_consent,record_create,record_delete,record_lookup,record_update,record,recurring_exception,recycle_bin_empty,recycle_bin_full,redo,refresh,relate,reminder,remove_formatting,remove_link,replace,replay,reply_all,reply,report_issue,reset_password,resource_absence,resource_capacity,resource_territory,restriction_policy,retail_execution,retweet,ribbon,richtextbulletedlist,richtextindent,richtextnumberedlist,richtextoutdent,right_align_text,right_align,right_join,right,robot,rotate,routing_offline,rows,rules,salesforce_page,salesforce1,save,scan,screen,search,section,segments,send_log,send,sender_email,sentiment_negative,sentiment_neutral,serialized_product_transaction,serialized_product,service_appointment,service_contract,service_report,service_territory_policy,settings,setup_assistant_guide,setup_modal,setup,share_file,share_mobile,share_post,share,shield,shift_pattern_entry,shift_pattern,shift_scheduling_operation,shift_ui,shopping_bag,shortcuts,side_list,signature,signpost,skill,skip_back,skip_forward,skip,slack_conversations,slack,slider,smiley_and_people,sms,snippet,sobject_collection,sobject,socialshare,sort_ascending,sort_policy,sort,spacer,sparkle,sparkles,spinner,stage_collection,stage,standard_objects,steps,stop,store,strategy,strikethrough,success,summary,summarydetail,survey,swarm_request,swarm_session,switch,symbols,sync_in_progress,sync,system_and_global_variable,table_settings,table,tableau,tablet_landscape,tablet_portrait,tabset,talent_development,target_mode,target,task,tax_policy,tax_rate,tax_treatment,text_background_color,text_color,text_template,text,textarea,textbox,threedots_vertical,threedots,thunder,tile_card_list,toggle_off,toggle_on,toggle_panel_bottom,toggle_panel_left,toggle_panel_right,toggle_panel_top,toggle,tollways,top_align,top_group_alignment,topic,topic2,touch_action,tour_check,tour,tracker,trail,trailblazer_ext,trailhead_alt,trailhead_ext,trailhead,transparent,transport_bicycle,transport_heavy_truck,transport_light_truck,transport_walking,travel_and_places,trending,truck,turn_off_notifications,type_tool,type,undelete,undeprecate,underline,undo,unlinked,unlock,unmuted,up,upload,user_role,user,variable,variation_attribute_setup,variation_products,video_off,video,visibility_rule_assigned,voicemail_drop,volume_high,volume_low,volume_off,waits,walkthroughs,warning,warranty_term,watchlist,water,weeklyview,wellness,width,wifi,work_forecast,work_order_type,work_queue,workforce_engagement,world,your_account,yubi_key,zoomin,zoomout',
    doctype: 'ai,attachment,audio,box_notes,csv,eps,excel,exe,flash,folder,gdoc,gdocs,gform,gpres,gsheet,html,image,keynote,library_folder,link,mp4,overlay,pack,pages,pdf,ppt,psd,quip_doc,quip_sheet,quip_slide,rtf,shared_folder,slide,stypi,txt,unknown,video,visio,webex,word,xml,zip',
    standard: 'account_info,account_score,account,action_list_component,actions_and_buttons,activation_target,activations,address,agent_home,agent_session,aggregate,aggregation_policy,ai_accelerator_card,all,announcement,answer_best,answer_private,answer_public,apex_plugin,apex,app_form_participant,app_form_product_participant,app,approval,apps_admin,apps,article,asset_action_source,asset_action,asset_audit,asset_downtime_period,asset_hierarchy,asset_object,asset_relationship,asset_state_period,asset_warranty,assigned_resource,assignment,attach,attribute_based_pricing,avatar_loading,avatar,bill_of_materials,bot_training,bot,branch_merge,brand,budget_allocation,budget_category_value,budget_period,budget,bundle_config,bundle_policy,bundles_pricing,business_hours,buyer_account,buyer_group_qualifier,buyer_group,calculated_insights,calibration,call_coaching,call_history,call,campaign_members,campaign,cancel_checkout,canvas,capacity_plan,care_request_reviewer,carousel,case_change_status,case_comment,case_email,case_log_a_call,case_milestone,case_transcript,case_wrap_up,case,catalog,category,change_request,channel_program_history,channel_program_levels,channel_program_members,channel_programs,chart,checkout,choice,client,cms,coaching,code_playground,code_set_bundle,code_set,collection_variable,collection,connect_wallet,connected_apps,constant,contact_list,contact_request,contact,contract_line_item,contract_line_outcome_data,contract_line_outcome,contract_payment,contract,cost_model,coupon_codes,crypto_category_wallet_group,crypto_product_category_wallet_role,crypto_product,crypto_transaction_envelope_change_snapshot,crypto_transaction_envelope_item,crypto_transaction_envelope,crypto_transaction,crypto_wallet_group_item,crypto_wallet_group,crypto_wallet,currency_input,currency,custody_chain_entry,custody_entry_verification,custody_override,custom_component_task,custom_notification,custom,customer_360,customer_lifecycle_analytics,customer_portal_users,customer_workspace,customer,customers,dashboard_component,dashboard_ea,dashboard,data_cloud,data_governance,data_graph,data_integration_hub,data_lake_objects,data_mapping,data_model,data_streams,data_transforms,datadotcom,dataset,datashare_target,datashares,date_input,date_time,decision,default,delegated_account,device,digital_verification_config_group,digital_verification_config,disclosure_and_compliance,discounts,display_rich_text,display_text,document_preview,document_reference,document,drafts,duration_downscale,dynamic_highlights_panel,dynamic_record_choice,education,einstein_replies,email_chatter,email,employee_asset,employee_contact,employee_job_position,employee_job,employee_organization,employee,empty,endorsement,entitlement_policy,entitlement_process,entitlement_template,entitlement,entity_milestone,entity,environment_hub,event,events,expense_report_entry,expense_report,expense,facility_bed,feed,feedback,field_sales,file,filter_criteria_rule,filter_criteria,filter,first_non_empty,flow,folder,forecasts,form,formula,fulfillment_order,funding_award_adjustment,funding_requirement,generic_loading,global_constant,goals,group_loading,groups,guidance_center,header_discounts,hierarchy,high_velocity_sales,historical_adherence,holiday_operating_hours,home,household,identifier,immunization,impact_outcome,impact_strategy_assignment,impact_strategy,inbox,incident,indicator_assignment,indicator_definition,indicator_performance_period,indicator_result,individual,insights,instore_locations,investment_account,invocable_action,iot_context,iot_orchestrations,javascript_button,job_family,job_position,job_profile,kanban,key_dates,knowledge,labels,lead_insights,lead_list,lead,learner_program,letterhead,lightning_component,lightning_usage,link,linked,list_email,list_fee,list_rate,live_chat_visitor,live_chat,location_permit,location,log_a_call,logging,loop,macros,maintenance_asset,maintenance_plan,maintenance_work_rule,manual_discounts,market,marketing_actions,med_rec_recommendation,med_rec_statement_recommendation,medication_dispense,medication_ingredient,medication_reconciliation,medication_statement,medication,merge,messaging_conversation,messaging_session,messaging_user,metric_definition,metric,metrics,mulesoft,multi_picklist,multi_select_checkbox,network_contract,news,nft_settings,nft_studio,no_code_model,note,number_input,observation_component,omni_channel,omni_supervisor,operating_hours,operation_plan_execution,operation_plan_request,operation_plan_step_execution,operation_plan_step,operation_plan,opportunity_contact_role,opportunity_splits,opportunity,orchestrator,order_item,orders,outcome_activity,outcome,output,panel_detail,partner_fund_allocation,partner_fund_claim,partner_fund_request,partner_marketing_budget,partners,party_profile,password,past_chat,path_experiment,patient_medication_dosage,payment_gateway,people_score,people,performance,person_account,person_language,person_name,photo,picklist_choice,picklist_type,planogram,policy,poll,portal_roles_and_subordinates,portal_roles,portal,post,practitioner_role,prep_flow,price_adjustment_matrix,price_adjustment_schedule,price_adjustment_tier,price_book_entries,price_books,price_sheet,pricebook,pricing_workspace,problem,procedure_detail,procedure,process_exception,process,product_consumed_state,product_consumed,product_item_transaction,product_item,product_quantity_rules,product_request_line_item,product_request,product_required,product_service_campaign_item,product_service_campaign,product_transfer_state,product_transfer,product_warranty_term,product_workspace,product,products,program_cohort_member,program_cohort,promotion_segments,promotion_tiers,promotions_workspace,promotions,prompt_builder,prompt,propagation_policy,proposition,qualifications,query_editor,question_best,question_feed,queue,quick_text,quip_sheet,quip,quotes,radio_button,rate_adjustment,read_receipts,real_time,recent,recipe,record_consent,record_create,record_delete,record_lookup,record_signature_task,record_update,record,recycle_bin,registered_model,related_list,relationship,repeaters,reply_text,report_type,report,resource_absence,resource_capacity,resource_preference,resource_skill,restriction_policy,return_order_line_item,return_order,reward,robot,rtc_presence,sales_cadence_target,sales_cadence,sales_channel,sales_path,sales_value,salesforce_cms,scan_card,schedule_objective,scheduling_constraint,scheduling_policy,scheduling_workspace_territory,scheduling_workspace,screen,search,section,segments,selling_model,serialized_product_transaction,serialized_product,service_appointment_capacity_usage,service_appointment,service_contract,service_crew_member,service_crew,service_report,service_request_detail,service_request,service_resource,service_territory_location,service_territory_member,service_territory_policy,service_territory,settings,setup_modal,shift_pattern_entry,shift_pattern,shift_preference,shift_scheduling_operation,shift_template,shift_type,shift,shipment,skill_entity,skill_requirement,skill,slack_conversations,slack,slider,sms,snippet_alt,snippet,snippets,sobject_collection,sobject,social,solution,sort_policy,sort,sossession,stage_collection,stage,steps,store_group,store,story,strategy,survey,swarm_request,swarm_session,system_and_global_variable,tableau,task,task2,tax_policy,tax_rate,tax_treatment,taxonomy,team_member,template,text_template,text,textarea,textbox,thanks_loading,thanks,time_period,timesheet_entry,timesheet,timeslot,title_party,today,toggle,topic,topic2,tour_check,tour,trailhead_alt,trailhead,travel_mode,unified_health_score,unmatched,uploaded_model,user_role,user,variable,variation_attribute_setup,variation_products,video,visit_templates,visits,visualforce_page,visualization,voice_call,volume_discounts,waits,walkthroughs,warranty_term,water,webcart,whatsapp,work_capacity_limit,work_capacity_usage,work_contract,work_forecast,work_order_item,work_order,work_plan_rule,work_plan_template_entry,work_plan_template,work_plan,work_queue,work_step_template,work_step,work_summary,work_type_group,work_type,workforce_engagement,workspace,your_account',
    custom: 'custom1,custom2,custom3,custom4,custom5,custom6,custom7,custom8,custom9,custom10,custom11,custom12,custom13,custom14,custom15,custom16,custom17,custom18,custom19,custom20,custom21,custom22,custom23,custom24,custom25,custom26,custom27,custom28,custom29,custom30,custom31,custom32,custom33,custom34,custom35,custom36,custom37,custom38,custom39,custom40,custom41,custom42,custom43,custom44,custom45,custom46,custom47,custom48,custom49,custom50,custom51,custom52,custom53,custom54,custom55,custom56,custom57,custom58,custom59,custom60,custom61,custom62,custom63,custom64,custom65,custom66,custom67,custom68,custom69,custom70,custom71,custom72,custom73,custom74,custom75,custom76,custom77,custom78,custom79,custom80,custom81,custom82,custom83,custom84,custom85,custom86,custom87,custom88,custom89,custom90,custom91,custom92,custom93,custom94,custom95,custom96,custom97,custom98,custom99,custom100,custom101,custom102,custom103,custom104,custom105,custom106,custom107,custom108,custom109,custom110,custom111,custom112,custom113',
    // action: 'add_contact,add_file,add_photo_video,add_relationship,adjust_value,announcement,apex,approval,back,bug,call,canvas,change_owner,change_record_type,check,clone,close,defer,delete,description,dial_in,download,edit_groups,edit_relationship,edit,email,fallback,filter,flow,follow,following,freeze_user,goal,google_news,info,join_group,lead_convert,leave_group,log_a_call,log_event,manage_perm_sets,map,more,new_account,new_campaign,new_case,new_child_case,new_contact,new_event,new_group,new_lead,new_note,new_notebook,new_opportunity,new_person_account,new_task,new,password_unlock,preview,priority,question_post_action,quote,recall,record,refresh,reject,remove_relationship,remove,reset_password,scan_disabled,scan_enabled,script,share_file,share_link,share_poll,share_post,share_thanks,share,sort,submit_for_approval,update_status,update,upload,user_activation,user,view_relationship,web_link'
}

const FIELD_TYPES = {
    TEXT: 'text',
    NUMERIC: 'numeric',
    DATE: 'date'
}

export default class IndicatorBuilder extends LightningElement {
    @api indicator = {};

    showMatch = {};
    iconSource = {}
    showTextMatch = false;
    showNumberMatch = false;
    overrideColours = false;

    startTime;
    endTime;

    showActiveVariant = false;
    showSpinner = false;
    
    get activeVariantTabIndex() {
        return this._activeVariantTabIndex;
    }
    set activeVariantTabIndex(value) {
        this.showActiveVariant = false;
        this._activeVariantTabIndex = value;
        this.itemVariants = this.itemVariants.map((variant, index) => {
            variant.isActive = index == this.activeVariantTabIndex;
            return variant;
        });
        this.activeVariant = this.itemVariants[this.activeVariantTabIndex];
    }
    _activeVariantTabIndex = 0;

    @track activeVariant = {};
    @track itemVariants = [];

    @track iconOptions = [];

    whenToDisplayOptions = [
        { label: 'Is not blank', value: 'notBlank' },
        { label: 'Is blank', value: 'isBlank' },
        { label: 'Contains text', value: 'containsText', fieldTypes: [FIELD_TYPES.TEXT], showMatch: 'text' },
        { label: 'Equals', value: 'equalsText', fieldTypes: [FIELD_TYPES.TEXT], showMatch: 'text' },
        { label: 'Equals', value: 'equalsNumber', fieldTypes: [FIELD_TYPES.NUMERIC], showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', fieldTypes: [FIELD_TYPES.NUMERIC], showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', fieldTypes: [FIELD_TYPES.NUMERIC], showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', fieldTypes: [FIELD_TYPES.NUMERIC], showMatch: 'numericRange' },
        // { label: 'Custom formula', value: 'customFormula' },
        // { label: 'Custom expression', value: 'customExpression' },
    ];

    iconSourceOptions = [
        { label: 'Lightning Icon', value: 'sldsIcon' },
        { label: 'Static Text', value: 'staticText' },
        { label: 'URL', value: 'url' },
        { label: 'Static Resource', value: 'staticResource' },
    ];

    iconSizeOptions = [
        { label: 'x-small', value: 'x-small' },
        { label: 'small', value: 'small' },
        { label: 'medium', value: 'medium', default: true },
        { label: 'large', value: 'large' },
    ];

    /* LIFECYCLE HOOKS */
    connectedCallback() {
        // this.processIconOptions();
        if (this.itemVariants.length === 0) {
            console.log(`adding default variants`);
            this.addNewVariant('When field has value', 'notBlank');
            this.addNewVariant('When field is blank', 'isBlank');
            this.activeVariantTabIndex = 0;
        }
    }

    renderedCallback() {
        if (this.endTime) {
            console.log(`elapsed time on render = ${this.endTime - this.startTime}`);
            this.endTime = null;
        }
        if (!this.showActiveVariant) {
            this.showActiveVariant = true;
        }
    }

    /* EVENT HANDLERS */
    handleAddVariantClick() {
        this.addNewVariant(`Indicator Variant ${(this.itemVariants.length + 1)}`);
    }

    handleTabAnchorClick(event) {
        this.activeVariantTabIndex = event.currentTarget.dataset.index;
    }

    handleVariantPropertyChange(event) {
        if (event.currentTarget.dataset.property) {
            let target = event.currentTarget;
            let tagName = target.tagName.toLowerCase();
            let value;
            if (tagName === 'c-icon-selector') {
                value = event.detail;
            } else if (target.type === 'checkbox') {
                value = target.checked;
            } else if (tagName === 'lightning-combobox') {
                value = event.detail.value;
            } else {
                value = target.value;
            }

            console.log(`index is ${target.dataset.index}, value is ${value}, property name is ${target.dataset.property}`);

            // let variantToUpdate = this.itemVariants[target.dataset.index];
            let variantToUpdate = this.activeVariant;
            if (variantToUpdate) {
                variantToUpdate[target.dataset.property] = value;
                if (target.dataset.property === 'iconSource') {
                    variantToUpdate.sourceValue = null;
                }
                this.itemVariants = [...this.itemVariants];
                console.log(`updated variant value = ${JSON.stringify(variantToUpdate)}`);
            }
        }
    }

    handleVariantDeleteClick(event) {
        event.preventDefault();
        event.stopPropagation();
        let index = event.target.dataset.index;
        this.itemVariants.splice(index, 1);
        if (this.itemVariants.length === 0) {
            this.addNewVariant('Indicator Variant 1');
        }
    }

    /* ACTION FUNCTIONS */
    addNewVariant(label, whenToDisplay) {
        this.itemVariants.push(this.newIndicatorVariant(label, whenToDisplay));
        this.activeVariantTabIndex = this.itemVariants.length - 1;
    }

    newIndicatorVariant(label, whenToDisplay, isActive = true, iconSource = 'sldsIcon') {
        let whenToDisplayOptions = this.whenToDisplayOptions;

        let newVariant = {
            label,
            whenToDisplay,
            isActive,
            iconSource,
            hoverText: '',
            sourceValue: null,
            // iconSourceIs: {},
            // filterTypeIs: {},

            get iconSourceIs() {
                return { [this.iconSource]: true }
            },
            get filterTypeIs() {
                let matchingOption = whenToDisplayOptions.find(option => option.value == this.whenToDisplay);
                return matchingOption ? { [matchingOption.showMatch]: true } : {};
            },
            get tabAnchorClass() {
                return 'slds-vertical-tabs__nav-item' + (this.isActive ? ' slds-is-active' : '');
            },
            get tabPaneClass() {
                return 'slds-vertical-tabs__content ' + (this.isActive ? 'slds-show' : 'slds-hide');
            },
            get showColourOption() {
                return this.iconSourceIs.sldsIcon;
            },
            get showColourSelectors() {
                return this.iconSourceIs.staticText || (this.showColourOption && this.overrideColours);
            }        
                
        }
        console.log(`newVariant = ${JSON.stringify(newVariant)}`);
        return newVariant;
    }

    /* WIRE FUNCTIONS */
    @wire(getSldsIcons, {})
    iconOptions({ error, data }){
        if(data){
            this.iconOptions = data;
        } else if (error){
            console.log('Get SLDS Icons Error: ', error);
            this.hasErrors = true;
            if(error.body.message == 'List has no rows for assignment to SObject'){
                this.errorMsg = 'Unable to locate SLDS Icons file.';
            } else {
                this.errorMsg = error;
            }
        }
    }

    /* UTILITY FUNCTIONS */
    processIconOptions() {
        let iconOptions = [];
        for (let [iconCategory, iconString] of Object.entries(ICONS)) {
            let iconNames = iconString.split(',');
            iconNames.forEach(iconName => {
                let val = `${iconCategory}:${iconName}`;                
                iconOptions.push({
                    label: val,
                    value: val,
                    icon: val
                });
            })
        }
        console.log(`${iconOptions.length} total options`);
        this.iconOptions = iconOptions;
        // this.iconOptions.length = 50;
    }
}