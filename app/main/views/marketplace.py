# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from datetime import datetime
import flask_featureflags

from flask_login import current_user
from flask import abort, current_app, make_response, render_template, request, url_for

from dmapiclient import APIError
from dmcontent.content_loader import ContentNotFoundError
from app.main.utils import get_page_list

from app import data_api_client, content_loader
from app.main import main
from app.helpers.terms_helpers import check_terms_acceptance, get_current_terms_version

from ..forms.brief_forms import BriefSearchForm

from flask_weasyprint import HTML, render_pdf


@main.route('/')
def index():
    try:
        buyers_count = data_api_client.get_buyers_count({'account_type': 'buyer'})['buyers']['total']

        suppliers_count = data_api_client.get_suppliers_count()['suppliers']['total']

        briefs_count_json = data_api_client.get_briefs_count()
        briefs_count = briefs_count_json['briefs']['open_to_all'] + briefs_count_json['briefs']['open_to_one'] + \
            briefs_count_json['briefs']['open_to_selected']
    except Exception as e:
        buyers_count = 0
        suppliers_count = 0
        briefs_count = 0
        current_app.logger.error(e)

    check_terms_acceptance()
    return render_template(
        'index.html',
        buyers_count=buyers_count,
        suppliers_count=suppliers_count,
        briefs_count=briefs_count
    )


@main.route('/ideation')
def ideation():
    return render_template('content/ideation.html')


@main.route('/new-seller')
def new_seller():
    return render_template('content/new-seller.html')


@main.route('/pitch')
def pitch():
    return render_template('content/pitch.html')


@main.route('/about-us')
def about_us():
    return render_template('content/about-us.html')


@main.route('/capabilities-and-rates')
def roles_and_services():
    return render_template('content/capabilities-and-rates.html')


@main.route('/contact-us')
def contact_us():
    return render_template('content/contact-us.html')


@main.route('/privacy-policy')
def privacy_policy():
    return render_template('content/privacy-policy.html')


@main.route('/disclaimer')
def disclaimer():
    return render_template('content/disclaimer.html')


@main.route('/buyers-guide')
def buyers_guide():
    return render_template('content/buyers-guide.html')


@main.route('/sellers-guide')
def sellers_guide():
    return render_template('content/sellers-guide.html')


@main.route('/copyright')
def copyright():
    return render_template('content/copyright.html')


@main.route('/terms-of-use')
def terms_of_use():
    terms = get_current_terms_version()
    return render_template(terms.template_file, update_time=terms.date)


@main.route('/<framework_slug>/opportunities/<brief_id>')
def get_brief_by_id(framework_slug, brief_id):
    briefs = data_api_client.get_brief(brief_id)
    brief = briefs.get('briefs')
    if brief['status'] not in ['live', 'closed']:
        if not current_user.is_authenticated or brief['users'][0]['id'] != current_user.id:
            abort(404, "Opportunity '{}' can not be found".format(brief_id))

    if current_user.is_authenticated and current_user.role == 'supplier':
        brief_responses = data_api_client.find_brief_responses(brief_id, current_user.supplier_code)["briefResponses"]
    else:
        brief_responses = None

    brief['clarificationQuestions'] = [
        dict(question, number=index+1)
        for index, question in enumerate(brief['clarificationQuestions'])
    ]

    brief_content = content_loader.get_builder('digital-service-professionals', 'display_brief').filter(
        brief
    )

    is_restricted_brief = brief.get('sellerSelector', '') in ('someSellers', 'oneSeller')

    return render_template(
        'brief.html',
        brief=brief,
        brief_responses=brief_responses,
        content=brief_content,
        show_pdf_link=brief['status'] in ['live', 'closed'],
        is_restricted_brief=is_restricted_brief,
    )


@main.route('/<framework_slug>/opportunities/opportunity_<brief_id>.pdf')
def get_brief_pdf(framework_slug, brief_id):
    return render_pdf(url_for('.get_brief_by_id', framework_slug=framework_slug, brief_id=brief_id))


@main.route('/<framework_slug>/opportunities')
def list_opportunities(framework_slug):
    framework = data_api_client.get_framework(framework_slug)['frameworks']
    if not framework:
        abort(404, "No framework {}".format(framework_slug))

    form = BriefSearchForm(request.args, framework=framework, data_api_client=data_api_client)
    # disabling csrf protection as this should only ever be a GET request
    del form.csrf_token
    if not form.validate():
        abort(400, "Invalid form data")

    api_result = form.get_briefs()

    briefs = api_result["briefs"]
    meta = api_result['meta']

    results_per_page = meta['per_page']
    total_results = meta['total']
    current_page = int(request.args.get('page', 1))

    pages = get_page_list(results_per_page, total_results, current_page)

    html = render_template('search/briefs.html',
                           framework=framework,
                           form=form,
                           filters=form.get_filters(),
                           filters_applied=form.filters_applied(),
                           briefs=briefs,
                           lot_names=tuple(label for id_, label in form.lot.choices),
                           briefs_count=total_results,
                           pages=pages,
                           num_pages=pages[-1],
                           current_page=current_page,
                           link_args=request.args,
                           )
    response = make_response(html)
    if current_user.is_authenticated and current_user.has_role('buyer'):
        # Buyers can create new briefs and want to see their updates more quickly.
        response.cache_control.max_age = min(300, current_app.config['DM_DEFAULT_CACHE_MAX_AGE'])
    return response
