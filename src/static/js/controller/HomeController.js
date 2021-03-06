/**
 * This controller involves fetching and rendering of search results.  
 * @param $scope
 */ 
var HomeController = function($scope) {

    $(document).ready(function() {
        $('.page_header').html('<h3>Package Distro Search (PDS)</h3><a href="#/faq" id="faq_link">FAQ</a>');
     });

    // List of supported OS and versions
    $scope.supported_oses_list = [];
    $scope.disclaimer_page = { name: 'disclaimer', url: '/static/js/views/disclaimer.html'};
    $scope.page_size = 10;
    $scope.number_of_items = 10;
    $scope.page_number = 0;
    $scope.current_page = 1;
    $scope.page_options = [5, 10, 20,30, 40, 50];
    $scope.distro_selected = false;
    $scope.display_column_list = [];
    $scope.prev_url = '';
    
    // Get the package information data from the server and process it for display
    $.ajax({
        url: 'getSupportedDistros',
        success: function(data){
            try{
                $scope.supported_oses_list = JSON.parse(data);
            }catch(e){
                console.log(e);
                $scope.supported_oses_list = data;
            }
                $scope.$apply();
            },
            failure: function(data){
                console.log("Not able to fetch Supported Distros information.");                
            }
      });

    // Ubuntu version to flavor mapping 
    $scope.ubuntu_mapping = {
        '16.04': 'xenial',
        '15.10': 'wily',
        '15.04': 'vivid',
        '14.04': 'trusty'
    };

    if($scope.packages_all === undefined){
        $scope.packages_all = [];
    }
    $scope.sortKey = 'name';
    $scope.reverse = false;
    $scope.request_complete = true;
    $scope.package_name = '';
    $scope.show_loader = false;
    $scope.toggle = false;
    $scope.empty_resultset_message = '';
    $scope.$watch('toggle', function(){
        $scope.toggleText = $scope.toggle ? '+' : '-';
    });

    //pagination logic for rendering page display on page change.
    $scope.recalculatePagination = function(package_count){
        $scope.totalItems = package_count;
        $scope.page_count = Math.ceil($scope.totalItems*1.0/$scope.page_size);
        $scope.currentPage = 1;
        $scope.maxSize = 5; // Number of pager buttons to show
        $scope.number_of_items = $scope.page_size;
    };

    $scope.shouldBeCheckAll = function(event){
        if (!document.getElementById(event.target.id).checked){
            $('#check__all').prop('checked', false);
            //Distro specific check-all
            try{
                distro_name = event.target.id.split('__')[0];
                $('#'+distro_name+'__all').prop('checked', false);
            }catch(e){
                console.log(e);
            }
        }
    };

    $scope.sort_by = function(sort_key, my_event, exact_match, page_size, page_count){
        // Modify the sort key based on selection.

        $scope.sort_key = sort_key;
        $scope.sort_reverse = ! $scope.sort_reverse;
        $scope.exact_match = exact_match;
        $scope.page_size = page_size;
        $scope.page_count = page_count;
        
        // also change the sorting icon
        $('.sorting-arrows').each(function(){
            $(this).addClass('fa-sort');
            $(this).removeClass('fa-sort-desc');
            $(this).removeClass('fa-sort-asc');
        });

        // Now update the selected element to reflect sorting icon and tooltip
        $('i[name=package_'+ $scope.sort_key +']').each(function(){
            if(!$scope.sort_reverse){
                $(this).addClass('fa-sort-desc');
                $(this).removeClass('fa-sort-asc');
                $(this).removeClass('fa-sort');
                $(this).attr("title",'Sort Descending');                
            }else{
                $(this).addClass('fa-sort-asc');
                $(this).removeClass('fa-sort-desc');
                $(this).removeClass('fa-sort');
                $(this).attr("title",'Sort Ascending');
            }                
        });

        $scope.fetchPackages(null, exact_match, page_size, 1, $scope.sort_key, $scope.sort_reverse);
    };

    $scope.setPage = function(pageNo) {
        $scope.currentPage = pageNo;
    };

    $scope.setItemsPerPage = function(num) {
        $scope.page_size = num;
        $scope.currentPage = 1; // reset to first page
        $scope.fetchPackages(null, $scope.exact_match, $scope.page_size, 0);
    };
    
    $scope.checkAll = function(os_object, my_name){
        if (!my_name){
            var os_name = os_object.name;
            var should_check = $('#'+$scope.textToVariableNaming(os_name)+'__all').prop("checked");
            for (i in os_object.versions){
                var child_id = $scope.textToVariableNaming(os_name) + '__' + $scope.textToVariableNaming(os_object.versions[i]);
                $('#'+child_id.toString().replace('.', '_')).prop("checked", should_check);
            }
        }else{
            for(i in os_object){
                $('#'+$scope.textToVariableNaming(os_object[i].name)+'__all').prop("checked", $('#check__all').prop("checked"));
                $scope.checkAll(os_object[i]);
            }
        }       
    };

    $scope.formatString = function(input_string, variable_obj){
        for (var attr in variable_obj) {
            if(attr !== undefined){
                input_string = input_string.replace("{" + attr + "}", variable_obj[attr]);              
            }
        }
        return input_string;
    };

    $scope.fetchDataFromUrl = function(json_data){
        if(json_data.length < 1){
            return;
        }
        if ($scope.sort_key === undefined){
            $scope.sort_key = 'name';
        }

        if($scope.sort_reverse === undefined){
            $scope.sort_reverse = 0;
        }

        bit_search = $scope.generateBitRepresentation(json_data);
        $scope.page_number = ($scope.page_number <= 0)? 1: $scope.page_number;
        package_name = (json_data.length > 0) ? json_data[0].package_name: '';
        new_url = 'getPackagesFromURL?page_size='+$scope.page_size+'&sort_key='+$scope.sort_key+'&reverse='+ $scope.sort_reverse +'&page_number='+$scope.page_number+'&exact_match='+ $scope.exact_match +'&package_name='+package_name+'&search_string='+bit_search;
        if ($scope.prev_url == '' || $scope.prev_url != new_url){
            $scope.prev_url = new_url;
        }else{
            $scope.show_loader = false;
            return;
        }

        // Get the package information data from the server and process it for display
        $.ajax({
            url: new_url,
            success: function(data){
        try{
                    distro_data = JSON.parse(data);
        }catch(e){
            console.log(e);
            distro_data = data;
        }
                package_count = distro_data.total_packages;
                package_data = distro_data.packages;
                packages_all = [];
                for(var i = 0; i < package_data.length; i++){
                    package_data[i].name = unescape(package_data[i].name);
                    packages_all.push(package_data[i]);
                };

                $scope.packages_all = packages_all;
                $scope.recalculatePagination(package_count);
                $scope.show_loader = false;
                if(package_count <= 0){
                    $scope.setEmptyMessage('Your search - "'+ unescape(json_data[0].package_name) +'" - did not match any package.');                    
                }

                addDisclaimer(document.getElementById('main_table_container'), $scope.packages_all.length > 0);
                $scope.highlightPage();
                $scope.$apply();
            },
            failure: function(data){
                $scope.show_loader = false;
                $scope.setEmptyMessage('Your search - "'+ unescape(json_data[0].package_name) +'" - did not match any package.');
                addDisclaimer(null, false, false);
            },
            error: function(req, response_status){
                $scope.error_message = 'There was a issue contacting server please try again later..';
                //$scope.setEmptyMessage('Your search - "'+ unescape(json_data[0].package_name) +'" - did not match any package.');
                $scope.setEmptyMessage('');
                addDisclaimer(null, false, false);
                $scope.show_loader = false;
                $( "#error_popup" ).dialog({
                    modal: true,
                    buttons: {
                      Ok: function() {
                        $( this ).dialog( "close" );
                      }
                    }
                });
                $scope.$apply();
            },
            timeout: 60000 // sets timeout to 60 seconds
          });
    };

    $scope.generateBitRepresentation = function(package_search_info){
        distro_bit_search_mapping = {
            'UBUNTU_17.04': '0',
            'UBUNTU_16.10': '0',
            'UBUNTU_16.04': '0',
            'SUSE_LINUX_ENTERPRISE_SERVER_12_SP2': '0',
            'SUSE_LINUX_ENTERPRISE_SERVER_12_SP1': '0',
            'SUSE_LINUX_ENTERPRISE_SERVER_11_SP4': '0'
        };

        for(var i = 0; i < package_search_info.length; i++){
            distro_name = package_search_info[i].name.toUpperCase();
            distro_version = package_search_info[i].version;
            distro_bit_search_mapping[distro_name + '_' + distro_version] = '1';
        }

        var distro_bit_search_mapping_vals = Object.keys(distro_bit_search_mapping).map(function(e) {
            return distro_bit_search_mapping[e]
        });

        distro_bit_search_mapping_vals = parseInt(distro_bit_search_mapping_vals.join(''), 2);

        return distro_bit_search_mapping_vals;
    };

    $scope.setEmptyMessage = function(msg){   
        // If there is no data returned by API call to server set No result message.
        $(document).ajaxStop(function() {
            if($scope.packages_all.length <= 0){
                $scope.empty_resultset_message = msg;               
            }else{
                $scope.empty_resultset_message = "";
            }
            $scope.show_loader = false;
            $scope.$apply();
        });
    };
    
    $scope.is_distro_selected = function(){
        should_continue = false;
        $('.flavor_with_version').each(function () {
            if(this.checked){
                should_continue = true;
            }
        });
        return should_continue;
    };

    $scope.highlightPage = function(){
        var other_pages = $('#page_number_'+$scope.page_number).siblings();

        for (var i = 0; i < other_pages.length; i++){
            $(other_pages[i]).removeClass('active');
        }

        if($scope.page_number == 1){
            $('#page_number_0').addClass('active');
        }else if($scope.page_number == ($scope.page_count)){
            $('#page_number_'+($scope.page_count+1)).addClass('active');
        }
        $('#page_number_'+$scope.page_number).addClass('active');
    };

    $scope.fetchPackages = function(my_event, exact_match, page_size, page_number, sort_key, sort_reverse){
        if(my_event !== undefined && my_event !== null){
            var keyCode = my_event.which || my_event.keyCode;
            if (keyCode !== 13) {
               return;
            }
        }
        if(!$scope.is_distro_selected()){
            $(".sub_menu_items_search").find("input[type=text]").blur();
            $scope.error_message = 'No Distros selected!';
            $( "#error_popup" ).dialog({
                modal: true,
                buttons: {
                  Ok: function() {
                    $( this ).dialog( "close" );
                  }
                }
            });
        }
        $scope.current_page = page_number;
        page_size = (page_size === undefined)? $scope.page_size: page_size;
        page_number = (page_number === undefined)? 0: page_number;
        prev_page = $scope.page_number;
        $scope.exact_match = (exact_match !== undefined)?exact_match:$scope.exact_match;
        $scope.page_size = (page_size !== undefined)?page_size:$scope.page_size;
        $scope.page_number = (page_number !== undefined)?page_number:$scope.page_number;
        $scope.sort_key = (sort_key !== undefined)?sort_key:$scope.sort_key;
        $scope.sort_reverse = (sort_reverse !== undefined)?sort_reverse:$scope.sort_reverse;

        $scope.highlightPage();

        // this method is responsible for making a API call to server to fetch required data and render it on UI.
        if(exact_match === undefined){
            exact_match = false;
        }       
        if($scope.package_name.length <= 2 && exact_match !== true){
            return;
        }       

        $scope.selected_distros = [];
        $scope.display_column_list = [];
        $('.flavor_with_version').each(function () {
            if(this.checked){
                $scope.show_loader = true;
                var self = {};
                self.display_name = '';
                self.name = this.id.split('__')[0];
                self.display_name = this.id.split('__')[0];
                // Hack for SLES distros
                if (self.name == 'SUSE_Linux_Enterprise_Server'){
                    self.version = this.id.split('__')[1];
                    self.display_name = self.name.replace(/_/g, ' ');
                }else{
                    self.version = this.id.split('__')[1].replace('_','.');
                }
                self.arch = 's390x';
                self.search_name = '';
                self.package_name = encodeURIComponent($scope.package_name);
                if(self.name == 'Ubuntu'){
                    self.alt_name = $scope.ubuntu_mapping[this.id.split('__')[1].replace('_','.')];
                }
                $scope.selected_distros.push(self);
                $scope.display_column_list[self.name] = self;
            }
        });

        display_column_list_temp = Object.keys($scope.display_column_list).map(function(key) {
            return $scope.display_column_list[key];
        });
        $scope.display_column_list = display_column_list_temp;
        $scope.fetchDataFromUrl($scope.formatString($scope.selected_distros));
    };

    $scope.textToVariableNaming = function(distro_name){
        return distro_name.replace(/ /g, '_');
    };

    $scope.getPages = function(){
        pages = [];
        var i = $scope.page_number + 1;
        if($scope.page_count <= 3 || i == 1){
            for(var c = 1; c <= $scope.page_count && c <= 3; c++){
                pages.push(c);
            }
        }else if(i >= $scope.page_count){
            pages.push($scope.page_count-2);
            pages.push($scope.page_count-1);
            pages.push($scope.page_count);
        }else{
            pages.push(i-1);
            pages.push(i);
            pages.push(i+1);
        }

        return pages;
    };

    $scope.getDistroVersion = function(distro, supported_os_name){
        supported_os_name = $scope.textToVariableNaming(supported_os_name.toLowerCase());
        distro_versions = distro[supported_os_name.toUpperCase()];
        if (distro_versions && supported_os_name == 'suse_linux_enterprise_server'){
            return distro_versions.join('/').replace(/-/g, ' ');
        }else if (distro_versions){
            return distro_versions.join('/');
        }else{
            return '';
        }
    };

    $scope.getSelectedPage = function(){
        $scope.fetchPackages(null, exact_match, page_size, iter);
    };
};

myApp.controller('HomeController', HomeController);