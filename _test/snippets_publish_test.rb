# 18F Hub - Docs & connections between team members, projects, and skill sets
#
# Written in 2014 by Mike Bland (michael.bland@gsa.gov)
# on behalf of the 18F team, part of the US General Services Administration:
# https://18f.gsa.gov/
#
# To the extent possible under law, the author(s) have dedicated all copyright
# and related and neighboring rights to this software to the public domain
# worldwide. This software is distributed without any warranty.
#
# You should have received a copy of the CC0 Public Domain Dedication along
# with this software. If not, see
# <https://creativecommons.org/publicdomain/zero/1.0/>.
#
# @author Mike Bland (michael.bland@gsa.gov)

require_relative "test_helper"
require_relative "../_plugins/snippets"
require_relative "site"

require "minitest/autorun"

module Hub
  class PublishSnippetsTest < ::Minitest::Test
    def setup
      @site = DummyTestSite.new
      @site.data['snippets'] = {}
      @expected = {}
    end

    def make_snippet(last_week, is_public: false)
      {
        'last-week' => last_week ? last_week.join("\n") : last_week,
        'this-week' => nil,
        'markdown' => true,
        'public' => is_public,
      }
    end

    def add_snippet(timestamp, snippet, expected: true)
      snippets = @site.data['snippets']
      snippets[timestamp] = [] unless snippets.member? timestamp
      snippets[timestamp] << snippet

      if expected
        @expected[timestamp] = [] unless @expected.member? timestamp
        @expected[timestamp] << snippet
      end
    end

    def test_empty_snippets
      Snippets.publish @site
      assert_equal @expected, @site.data['snippets']
    end

    def test_publish_all_snippets
      add_snippet('20141218', make_snippet(['- Did stuff']))
      add_snippet('20141225', make_snippet(['- Did stuff']))
      add_snippet('20141231', make_snippet(['- Did stuff']))
      add_snippet('20150107', make_snippet(['- Did stuff'], is_public: true))
      Snippets.publish @site
      assert_equal @expected, @site.data['snippets']
    end

    def test_publish_only_public_snippets_in_public_mode
      add_snippet('20141218', make_snippet(['- Did stuff']), expected: false)
      add_snippet('20141225', make_snippet(['- Did stuff']), expected: false)
      add_snippet('20141231', make_snippet(['- Did stuff']), expected: false)
      add_snippet('20150107', make_snippet(['- Did stuff'], is_public: true))
      @site.config['public'] = true
      Snippets.publish @site
      assert_equal @expected, @site.data['snippets']
    end

    def test_convert_jesse_style
      @site.data['snippets']['20150104'] = [
        make_snippet(['::: Jesse style :::', 'Jesse did stuff'])
      ]
      @expected['20150104'] = [
        make_snippet(
          ["#{Snippets::HEADLINE} Jesse style", '- Jesse did stuff'])
      ]
      Snippets.publish @site
      assert_equal @expected, @site.data['snippets']
    end

    def test_convert_elaine_style
      @site.data['snippets']['20150104'] = [
        make_snippet(['*** Elaine style', '-Elaine did stuff'])
      ]
      @expected['20150104'] = [
        make_snippet(
          ["#{Snippets::HEADLINE} Elaine style", '- Elaine did stuff'])
      ]
      Snippets.publish @site
      assert_equal @expected, @site.data['snippets']
    end
  end
end
