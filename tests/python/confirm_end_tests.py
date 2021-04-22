import requests
import selenium
from selenium import webdriver
import unittest
import rstr



def enter_value(textbox_value):
        # Once you login, you have to click through a few buttons
        # First click the start button to launch the exam
        driver = webdriver.Chrome()
        driver.get("r.url")
        start_button = driver.driver.find_element_by_id("startBtn")
        start_button.click()

        # Next you have to click the end button to end the exam and access my feature
        end_button = driver.driver.find_element_by_id("endBtn")
        end_button.click()

        inputElement = driver.find_element_by_id("confirm_end")
        inputElement.send_keys(textbox_value)
        
        finished_exam_succesfully = True
        try:
            finished_exam_text = driver.driver.find_element_by_class("btn btn-link review")
            finished_exam_succesfully = True
        Exception:
            finished_exam_succesfully = False


# Test to confirm that the additional functions which I added do not break the ability to reach the server
def test_confirm_connection():
    url = 'http://localhost:8000/exam/login'
    with requests.Session() as s:
        s.get(url)
        if 'csrftoken' in s.cookies:
        # Django 1.6 and up
            csrftoken = s.cookies['csrftoken']
        else:
        # older versions
            csrftoken = s.cookies['csrf']

        login_data = dict(username="vnathan", password="napoleon123", csrfmiddlewaretoken=csrftoken, next='/')
        r = s.post(url, data=login_data, headers=dict(Referer=url))
        assert(r.url, 'http://localhost:8000/exam/1/test-exam/preview/')


def test_confirm_type_end():

    # This test checks to see if my new functionality works.
    #It enters end into the textbox, and then checks to see if you have moved on to the next page

    url = 'http://localhost:8000/exam/login'
    with requests.Session() as s:
        s.get(url)
        if 'csrftoken' in s.cookies:
        # Django 1.6 and up
            csrftoken = s.cookies['csrftoken']
        else:
        # older versions
            csrftoken = s.cookies['csrf']

        login_data = dict(username="vnathan", password="napoleon123", csrfmiddlewaretoken=csrftoken, next='/')
        r = s.post(url, data=login_data, headers=dict(Referer=url))


        # Once you login, you have to click through a few buttons
        # First click the start button to launch the exam
        driver = webdriver.Chrome()
        driver.get("r.url")
        start_button = driver.driver.find_element_by_id("startBtn")
        start_button.click()

        # Next you have to click the end button to end the exam and access my feature
        end_button = driver.driver.find_element_by_id("endBtn")
        end_button.click()

        inputElement = driver.find_element_by_id("confirm_end")
        inputElement.send_keys('end')
        
        finished_exam_succesfully = True
        try:
            finished_exam_text = driver.driver.find_element_by_class("btn btn-link review")
            finished_exam_succesfully = True
        Exception:
            finished_exam_succesfully = False
        assert (finished_exam_succesfully, True)

def test_confirm_fuzzer_values():

    status_list = []
    random_string_list = []
    for i in range (0,10000):
        random_string_list.append(rstr.rstr(string.printable))

    for fuzzed_input in random_string.printable():
        url = 'http://localhost:8000/exam/login'
        with requests.Session() as s:
            s.get(url)
            if 'csrftoken' in s.cookies:
            # Django 1.6 and up
                csrftoken = s.cookies['csrftoken']
            else:
            # older versions
                csrftoken = s.cookies['csrf']

            login_data = dict(username="vnathan", password="napoleon123", csrfmiddlewaretoken=csrftoken, next='/')
            r = s.post(url, data=login_data, headers=dict(Referer=url))
            enter_value(fuzzed_input)
            r = requests.get('http://localhost:8000/exam/1/test-exam/preview/')
            status_list.append(r.status)
    is_ok = True
    for stat in status_list:
        if stat != 200:
            is_ok = False
    assert(is_ok, True)
            
    

