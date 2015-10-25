var fs=require("fs");

function getLangFromHeaders(req){
	
	var languagesRaw = req.headers['accept-language'] || "NONE";
    var lparts = languagesRaw.split(",");
    var languages = [];
    
    for(var x=0; x<lparts.length; x++){
    	
        var unLangParts=lparts[x].split(";");
	    languages.push(unLangParts[0]);
       		
	}
        
    return languages;
	
}

function getLangFromCookie(req, cookieName){
	
	if(cookieName && req.session && req.session[cookieName]){
    	return req.session[cookieName];
    }else{
        if(cookieName in req.cookies){
	        return req.cookies[cookieName].toString();
        }else{
	        return "";
        }
    }

}

function loadLangJSONFiles(langPath, defaultLang){
	
	var i18n=[];
	i18n[defaultLang]=[];
	
    var files=fs.readdirSync(langPath);

	if(files){
	    for(var i=0;i<files.length;i++){
	        if(files[i].split('.').pop()=="json" && files[i].substr(0,1) != "." ){
	            if(files[i].split('.').shift()){

	            	try{
	            		delete require.cache[require.resolve(langPath+"/"+files[i])];
	            	}catch(e){}
	            	
	                i18n[files[i].split('.').shift().toLowerCase()]=require(langPath+"/"+files[i]);
	            }
	        }                   
	    }
    }else{
		console.log("[i18n] No files in "+langPath);
	}
    
  return i18n;
	
}


exports = module.exports = function (translationsPath, cookieLangName, browserEnable, defaultLang){

	var i18nTranslations=[];
	
	var translationsPath=translationsPath || "i18n";
	var cookieLangName= cookieLangName || "";
	var browserEnable = browserEnable || true;
	var defaultLang=defaultLang || "en";
		
	var computedLang="";
	
	i18nTranslations=loadLangJSONFiles(translationsPath, defaultLang);
	
	fs.watch(translationsPath, function (event, filename) {
			
		if (filename) {
			i18nTranslations=loadLangJSONFiles(translationsPath, defaultLang);
		}

	});
	
	return function i18n(req, res, next) {
	
		var alreadyTryCookie=false;
		var alreadyBrowser=false;
		
		while(computedLang==""){
				
			if(cookieLangName && alreadyTryCookie == false){				
				var cLang=getLangFromCookie(req, cookieLangName);
				if(cLang){
					computedLang=cLang;
					break;
				}else{
					alreadyTryCookie=true;
					continue;
				}
				
			}else if(browserEnable && alreadyBrowser == false){
		 	    var wLang=getLangFromHeaders(req);

				if(wLang.length){
					computedLang=wLang[0];
					break;
				}else{
					alreadyBrowser=true;
					continue;
				}
						
			}else{
				computedLang=defaultLang;
			}
		
		}
		
		
		function setDefaulti18n(){
			req.app.locals['texts']=i18nTranslations[defaultLang];
			req.app.locals['lang']=defaultLang;
		}
		
		computedLang=computedLang.toLowerCase();
		
		//setting texts to views
		
		if(computedLang in i18nTranslations){
			req.app.locals['texts']=i18nTranslations[computedLang];
			req.app.locals['lang']=computedLang;
		}else{
			if(computedLang.indexOf("-") > -1){
				//try extract "en" from "en-US"
				var soloLang=computedLang.split("-")[0];
				if(soloLang in i18nTranslations){
					req.app.locals['texts']=i18nTranslations[soloLang];
					req.app.locals['lang']=soloLang;
				}else{
					setDefaulti18n();
				}
			}else{
				setDefaulti18n();
			}
		}
		
		//req.i18n_all_texts=i18nTranslations;
		req.i18n_texts=req.app.locals['texts'];
		req.i18n_lang=req.app.locals['lang'];

		next();
   
  };
  
};