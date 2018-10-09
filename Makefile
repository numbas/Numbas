everything: update_tests docs

RUNTIME_SOURCE_PATH=.

update_tests: jme runtime marking_scripts

SCRIPTS_DIR=runtime/scripts
MINIMAL_SOURCES=numbas.js localisation.js util.js math.js
THIRD_PARTY_SOURCES=i18next/i18next.js es5-shim.js
JME_SOURCES=jme-rules.js jme.js jme-builtins.js jme-display.js jme-variables.js
RUNTIME_SOURCES=$(MINIMAL_SOURCES) $(JME_SOURCES) part.js  question.js exam.js schedule.js  marking.js json.js
PART_SOURCES=$(wildcard $(RUNTIME_SOURCE_PATH)/$(SCRIPTS_DIR)/parts/*.js)
THEME_DIR=themes/default/files/scripts
THEME_SOURCES=answer-widgets.js
ESLINT_SOURCES = $(patsubst %, $(SCRIPTS_DIR)/%, $(RUNTIME_SOURCES)) $(patsubst %, $(THEME_DIR)/%, $(THEME_SOURCES)) $(PART_SOURCES)
ALL_SOURCES = $(patsubst %, $(SCRIPTS_DIR)/%, $(RUNTIME_SOURCES) $(THIRD_PARTY_SOURCES)) $(patsubst %, $(THEME_DIR)/%, $(THEME_SOURCES)) $(PART_SOURCES)


define created
@echo -e "\e[32m✓ Created $@\e[0m"
endef

tests/numbas-runtime.js: $(patsubst %, $(RUNTIME_SOURCE_PATH)/%, $(ALL_SOURCES))
	@echo "// Compiled using $(ALL_SOURCES)" > $@
	@printf "// From the Numbas compiler directory\n" >> $@
	@for p in $^; do cat $$p >> $@; echo "" >> $@; done
	$(created)

runtime: tests/numbas-runtime.js

tests/jme-runtime.js: $(patsubst %, $(RUNTIME_SOURCE_PATH)/$(SCRIPTS_DIR)/%, $(MINIMAL_SOURCES) $(THIRD_PARTY_SOURCES) $(JME_SOURCES))
	@echo "// Compiled using $(ALL_SOURCES)" > $@
	@printf "// From the Numbas compiler directory\n" >> $@
	@for p in $^; do cat $$p >> $@; echo "" >> $@; done
	$(created)

jme: tests/jme-runtime.js

MARKING_SCRIPTS=$(wildcard $(RUNTIME_SOURCE_PATH)/marking_scripts/*.jme)

define MARKING_INTRO
Numbas.queueScript('marking_scripts',['marking'],function() {
    Numbas.marking_scripts = {
endef
define MARKING_END

	};
	for(var x in Numbas.marking_scripts) {
		Numbas.marking_scripts[x] = new Numbas.marking.MarkingScript(Numbas.marking_scripts[x]);
	}
});
endef
export MARKING_INTRO
export MARKING_END

define encode_marking
echo "        \"$(notdir $(basename $(f)))\": " >> $@; cat $(f) | python -c 'import json,sys; sys.stdout.write(json.dumps(sys.stdin.read()))' >> $@;
endef

tests/marking_scripts.js: $(MARKING_SCRIPTS)
	@echo "$$MARKING_INTRO" > $@
	@$(foreach f,$(wordlist 1,1,$^),$(encode_marking))
	@$(foreach f,$(wordlist 2,$(words $^),$^),printf ",\n" >> $@;$(encode_marking))
	@echo "$$MARKING_END" >> $@
	$(created)

marking_scripts: tests/marking_scripts.js

define LOCALES_INTRO
Numbas.queueScript('localisation-resources',['i18next'],function() {
Numbas.locale = {
    preferred_locale: "en-GB",
    resources: {
endef
define LOCALES_END
	}
}
});
endef
export LOCALES_INTRO
export LOCALES_END

define encode_locale
echo "        \"$(notdir $(basename $(f)))\": {translation: " | tr '[:upper:]' '[:lower:]' >> $@; cat $(f) >> $@; echo "}" >> $@;
endef

LOCALES=$(wildcard $(RUNTIME_SOURCE_PATH)/locales/*.json)
tests/locales.js: $(LOCALES)
	@echo "$$LOCALES_INTRO" > $@
	@$(foreach f,$(wordlist 1,1,$^),$(encode_locale))
	@$(foreach f,$(wordlist 2,$(words $^),$^),printf ",\n" >> $@;$(encode_locale))
	@echo "$$LOCALES_END" >> $@
	$(created)

locales: tests/locales.js

docs/index.html: $(ALL_SOURCES) docs.md jsdoc.conf
	@echo "Making API documentation..."
	jsdoc -c jsdoc.conf -t ../numbas-jsdoc-template
	$(created)

docs: docs/index.html

eslint: $(ESLINT_SOURCES)
	@eslint $^

