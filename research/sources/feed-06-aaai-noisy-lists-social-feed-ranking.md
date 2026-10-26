# Leveraging Noisy Lists for Social Feed Ranking

- Canonical URL: https://ojs.aaai.org/index.php/ICWSM/article/view/14424
- Full text PDF: https://ojs.aaai.org/index.php/ICWSM/article/download/14424/14273
- Accessed: 2026-10-26
- Publication: 2013 (Proceedings of the Seventh International AAAI Conference on Weblogs and Social Media; DOI metadata registered 2021-08-03).

                              Proceedings of the Seventh International AAAI Conference on Weblogs and Social Media




                              Leveraging Noisy Lists for Social Feed Ranking

                     Matthew Burgess, Alessandra Mazzia, Eytan Adar, Michael Cafarella
                                                  University of Michigan, Ann Arbor
                                            {mattburg, amazzia, eadar, michjc} @umich.edu




                            Abstract                                       user Alice may be primarily interested in data mining, but
                                                                           also interested in cooking and literature. She follows topic-
  Active users of social networks are subjected to extreme                 matter experts on all these subjects, but because the primary
  information overload, as they tend to follow hundreds (or
  even thousands of other users). Aggregated social feeds on
                                                                           consumption mechanism is a single social feed, all messages
  sites like Twitter are insufficient, showing superfluous con-            will become intermingled regardless of what they are about.
  tent and not allowing users to separate their topics of interest            The converse of the context collapse problem is channel
  or place a priority on the content being pushed to them by               collapse. While context collapse describes the consumption
  their “friends.” The major social network platforms have be-             of information—all the people a user follows push their up-
  gun to implement various features to help users organize their           dates into one place—channel collapse describes the produc-
  feeds, but these solutions require significant human effort to           tion of content. A particular user, Jane, may be followed by
  function properly. In practice, the burden is so high that most          others for many reasons: her family for pictures of the grand-
  users do not adopt these features. We propose a system that
                                                                           children, gamer buddies for the latest news on new releases,
  seeks to help users find more relevant content on their feeds,
  but does not require explicit user input. Our system, B UTTER -          and work colleagues for Java coding tips. However, because
  WORTH , automatically generates a set of “rankers” by iden-              Jane has only one output mechanism available to her, any
  tifying sub-communities of the user’s social network and the             content she creates—be it pictures of her children or Java
  common content they produce. These rankers are presented                 tips—will be seen by all subscribers to her feed, whether
  using human-readable keywords and allow users to rank their              they are interested in the topic or not. Alice, who follows
  feed by specific topics. We achieve an average top-10 preci-             Jane only because of their shared interest in games, will be
  sion of 78%, as compared to a baseline of 45%, for automat-              forced to sift through irrelevant Java tips and family pictures.
  ically generated topics.                                                 Conversely, Jane’s father must get through coding and gam-
                                                                           ing messages before getting to the pictures.
                        Introduction                                          In response to the problems of context and channel col-
                                                                           lapse, social networking sites have implemented features
   Over the past few years, online social networks have                    that allow users to group their friends into lists. Lists let
shifted focus from socialization platforms to information                  users better organize their feeds by grouping friends who
hubs. Users log onto social networks to obtain the latest                  share a similar context; users can then access sub-feeds that
updates from their personal friends as well as commentary,                 only contain content from friends in that grouping. In many
links, and news from colleagues and subject-matter experts.                situations these lists are intended to aid in consumption, but
The conventional mechanism for displaying this information                 recent trends in interfaces for these systems also allow lists
is the social feed, a long (usually) time-ordered list of up-              to be used for targeting produced content. Allowing users to
dates. Active users of social networking sites like Twitter can            target their posts based on the topic of the content has the po-
follow the updates of hundreds or thousands of other users.                tential to alleviate channel collapse. While such features can
This can produce feeds that contain hundreds of new items                  help users better organize their feeds, they require signifi-
per hour, many of which are irrelevant to the user. As social              cant human effort, as well as widespread adoption, in order
networks snowball in popularity and friend networks grow                   to be effective.
in size, users become increasingly less able to find relevant
content as both context and channels collapse.                                In this paper we propose B UTTERWORTH, a system that
   Users’ feeds often contain a heterogeneous mixture of in-               provides a solution to both context collapse and channel col-
formation from many sources and on a variety of topics.                    lapse. We observed in pilot experiments that when users cre-
This heterogeneity is caused by context collapse, the phe-                 ate lists, they are also implicitly indicating which content
nomenon in which many people, usually situated in differ-                  produced by members of that list they are interested in. This
ent contexts, are suddenly grouped together. For instance, a               is most often the topics discussed in common by all mem-
                                                                           bers of that list. For example, when creating a visualization
Copyright c 2013, Association for the Advancement of Artificial            list, a user includes other users who post about visualization.
Intelligence (www.aaai.org). All rights reserved.                          Each user in the list may post about whatever other topic she



                                                                      31
also finds interesting, but a common topic across all of their          These approaches address both content and context collapse
posts will likely be visualization. By finding this common              by learning user preferences and hiding irrelevant content.
core, it becomes easy to train a ranking algorithm to high-             However, these models do not necessarily aid a user in orga-
light posts related to visualization. Unfortunately, most users         nizing her information–an explicit goal of B UTTERWORTH.
do not create lists.                                                    Additionally, while effective with enough training data, such
   To address this issue, we designed B UTTERWORTH to                   systems often require a great deal of training data to be use-
leverage manually created lists when available, but also                ful. One of the goals for B UTTERWORTH was not to require
to automatically identify people who should be placed to-               direct input from the user, but instead leverage the inherent
gether in a list. Unlike topic-modeling approaches, which               homophily in a user’s social network to provide high quality
are highly sensitive to input, computationally complex, re-             groups, and subsequently, rankings.
quire substantial tuning, and are difficult to present to users,           A different approach to data management focuses on or-
B UTTERWORTH’s novel approach leverages the inherent ho-                ganizing and classifying rather than ranking. If content is
mophily of social networks. By mining a specially weighted              clustered for a user based on topic, she may identify and se-
version of a user’s social network, B UTTERWORTH can scal-              lect the information that is relevant to her. Topic modeling
ably build lists that closely simulate manually created lists,          based methods (both on users and content) feature promi-
down to picking human readable list labels. For each of these           nently in this space (Hong and Davison 2010; Lin, Snow,
topics B UTTERWORTH generates a “ranker” that re-orders                 and Morgan 2011; Ramage, Dumais, and Liebling 2010;
the user’s feed by the relevance of the items to the selected           Xu et al. 2011). Inspired by these ideas, an earlier version of
topic. B UTTERWORTH leverages only a user’s social net-                 B UTTERWORTH attempted to build Latent Dirichlet Alloca-
work and content produced by their friends; it therefore re-            tion (LDA) topic models. While useful for describing lists,
quires no direct supervision from the user.                             we encountered many common problems: they were com-
   We have tested each component of B UTTERWORTH and                    putationally costly, highly sensitive to noise, and required
have shown that it is able to achieve high levels of precision          too much tuning to work effectively across a broad spec-
and recall, on both topic discovery and ranking. We have de-            trum of users. Further, providing interpretable descriptions
signed B UTTERWORTH to be broadly applicable to all main-               for topic models is a notoriously difficult problem, and even
stream social network platforms, but have chosen Twitter as             “optimal” models may not be consistent with reader pref-
our platform due to its popularity and public API.                      erences (Boyd-Graber et al. 2009). Prior work has demon-
                                                                        strated that unlike topic models, the names of lists in which
                      Related Work                                      a particular Twitter user appears are much better representa-
   There has been a substantial amount of recent research               tions of the expertise of that user (Wagner et al. 2012). Be-
on managing social media data. However, this work has ei-               cause of these common problems, we chose to move away
ther emphasized text-only approaches (e.g., better ranking              from topic modeling.
and topic modeling) or network-only strategies (e.g., com-                 In addition to the topic-modeling work for analyzing the
munity detection). B UTTERWORTH seeks to leverage both                  individuals a user may follow, there has been a small amount
approaches to create a more robust technique that can be                of work on explicitly managing lists on social networks. Kim
readily integrated into user interfaces in a manner consistent          et al. (Kim et al. 2010) conducted an analysis of lists on
with users’ expectations.                                               Twitter and concluded that topic-centric lists contain users
   The bulk of work in social media ranking has focused                 who tend to publish content on similar topics, reinforcing
on classifying posts in a user’s feed (Dahimene, Mouza,                 the motivation for our distant supervision heuristics. An-
and Scholl 2012; Das Sarma et al. 2010; Hong et al. 2012;               other analysis by Fang et al. (Fang, Fabrikant, and LeFevre
Paek et al. 2010; Pal and Counts 2011; Sriram et al. 2010;              2012) studied sharing “circles” on Google+, and discovered
Uysal and Croft 2011). Both Hong et al. (Hong et al.                    that circle sharing enabled users with few contacts to grow
2012) and Das Sarma et al. (Das Sarma et al. 2010) pro-                 their networks more quickly. In this arena, our work is most
posed ranking mechanisms based on collaborative filter-                 similar to that of Guc (Guc 2010), which describes a filtering
ing techniques. Hong et al. used a click-through rate based             mechanism for “list-feeds”; however, that work is framed as
model while Das Sarma et al. compared various mecha-                    a standard supervised learning problem that also requires ex-
nisms based on different types of user supervision, includ-             plicit training data from the user.
ing having the user provide pair-wise comparisons of feed                  Finally, a number of research systems have focused on
items. Paek et al. and Dahimene et al. (Paek et al. 2010;               creating interfaces that enable users to more efficiently
Dahimene, Mouza, and Scholl 2012) built ranking and fil-                browse their feed (Bernstein et al. 2010; Hong et al. 2010;
tering methods that are personalized for each user and which            Tseng, Chen, and Chen 2012). For example, Eddi (Bern-
explicitly model the user that is producing the tweet. Uysal            stein et al. 2010) displays a browsable tag cloud of all the
et al. (Uysal and Croft 2011) describe methods to predict the           topics in a user’s feed, allowing the user to more easily
likelihood of retweets (a user propagating a tweet to friends),         find tweets related to her interests. FeedWinnower (Hong
and used the likelihood of retweet as the ranking score.                et al. 2010) is an interface that allows users to rank tweets
Pal et al.’s algorithm for finding relevant Twitter users (Pal          by different tunable parameters such as time and topic.
and Counts 2011) is an unusual point in the space as it at-             Tseng et al. proposed a (graph) visualization system called
tempts to identify topic experts using a classifier that lever-         SocFeedViewer (Tseng, Chen, and Chen 2012), that al-
ages features such as follower counts and retweeted content.            lows users to analyze a topological view of their social



                                                                   32
graph. SocFeedViewer implements community detection al-                 System Architecture
gorithms to group similar users; as with B UTTERWORTH’s                    B UTTERWORTH comprises three main components, as
lists, these community feeds may contain irrelevant content,            seen in Figure 1. The list generator partitions friends into
a problem that SocFeedViewer does not address. Many of                  lists by analyzing their social network. These user lists are
these systems apply one or more of the ranking and clas-                then fed into the list labeler that generates a concise label
sification techniques described above. This, unfortunately              representing the list’s (central) topic. The generated lists are
yields lower precision and recall. The higher quality group-            then sent to the topic ranker, which trains ranking models
ing and ranking strategy of B UTTERWORTH can be readily                 for this core topic. The models can then be used to rank the
integrated into various commercial and research interfaces              user’s feed by the selected topic.
and directly improve their function.
                                                                        List Generator The first step in the B UTTERWORTH
                                                                        pipeline is to automatically discover groups of users that
                   Problem Overview                                     discuss similar topics within a user’s ego network, and to
                                                                        partition the members of this network into lists. The ego-
   Since B UTTERWORTH is focused on an end-user bur-                    network is a subset of the social network (in this case, a
dened by irrelevant feed content, we present user scenarios             modified and weighted follower/followee graph). It is de-
that describe today’s current situation as well as the feed             rived from the friends connected to a core “ego” individual
interaction enabled by B UTTERWORTH. We then give an                    and the links among these friends, excluding any edges to
overview of B UTTERWORTH’s major components.                            the ego node. The goal of this module is to generate lists
                                                                        (we call these topical lists) such that each list corresponds
User Scenario                                                           to one of the user’s topics of interest. Even if a user’s main
                                                                        objective on Twitter is to obtain information on topics of in-
   To see how users struggle with today’s social feeds, re-             terest, they likely follow users for a variety of other reasons.
call our example user Alice. Alice has joined Twitter to                For instance, a user may follow their co-workers or family
find information about data mining, literature, and cooking.            members. The generated lists for a user may therefore also
She follows many users who generate content on her main                 include these contextual lists that are less topically coherent
interests, but she also follows other users for various rea-            (e.g., lists that contain users who all live in the same town or
sons (e.g., they are co-workers, family members, etc.). While           are all family members). After computing these topical and
sometimes Alice enjoys browsing her feed to see the latest              contextual lists, the list generator filters out all contextual
content from her friends, at other times she wants to see only          lists (as described in the Graph Clustering section).
content related to her main topics of interest. With the tradi-            For an example we turn back to Alice. The list generator
tional feed mechanism, Alice suffers from context collapse;             takes as input Alice’s ego network and partitions all of her
if she wants to see only content related to cooking, she must           friends into lists. Some of these lists will correspond to her
manually search through her feed to find cooking tweets.                interests like cooking and data mining, and others will con-
Since Alice is interested in cooking, she could devote some             tain her college friends, co-workers, etc. The list generator
time to using Twitter’s list feature to group together all of           then removes the contextual lists, so that only the topical
her friends who write about cooking. When Alice clicks on               lists remain.
her cooking list she is shown a sub-feed consisting of only                While generating high-quality lists is an important prob-
content from the users in the cooking list. Sadly, this does            lem, it is not B UTTERWORTH’s end goal; we formulate these
not help Alice very much, since she realizes that the friends           lists in order to produce high quality topic rankers. While
she follows for cooking information also write about many               low-quality lists can have a bad effect on downstream rank-
other topics. Alice’s lists allow her to break up her feed into         ing performance, we show experimentally that perfect lists
contextualized groups, but this is not enough, as channel col-          are not required for high-quality ranking. The ideal output
lapse fills even her list-specific feeds full of irrelevant con-        of the list generator is a set of lists that comes close to the
tent.                                                                   quality of lists that users generate themselves, which is how
                                                                        we evaluate this component in the experiments.
   Alice’s experience is very different when she uses B UT-
TERWORTH . Once Alice logs into Twitter, B UTTERWORTH                   List Labeler B UTTERWORTH’s second component is the
automatically identifies her topics of interest and presents            list labeler. It generates relevant and human-understandable
them to her. If Alice has already created a list, such as her           labels for each of the lists generated in the previous step.
cooking list, then B UTTERWORTH can incorporate it into                 These labels are also attached to the generated rankers and
the topics presented (though manual list creation is not re-            are intended for display to the user in the system interface,
quired). Alice is then able to choose a topic that interests            enabling her to select which topic ranking she wants applied.
her; when she does, messages in her feed are ranked by their            For example, the list labeler should name Alice’s cooking
relevance to the topic selected. Alice’s feed is no longer af-          list as “cooking” or something similar. While it is, of course,
fected by context collapse, since B UTTERWORTH automat-                 possible to formulate lists without generating accompanying
ically generates lists that correspond to her interests. In ad-         labels, the resulting interface would be substantially harder
dition, her feed is no longer affected by channel collapse,             to use—Alice would need to resort to clicking on all the
since B UTTERWORTH pushes the relevant content to the top               B UTTERWORTH-given topics and reading sets of tweets to
of her feed.                                                            discover the topic behind each one.



                                                                   33
                                                                                  Cooking                              User's Feed

                                                                                                 Sports
                                List                                  List                                 Topic
                              Generator                             Labeler                               Ranker



         User's Ego-Network                 Unlabeled Lists                       Topic-Labeled Lists               Per-Topic Ranking

Figure 1: B UTTERWORTH has three components. The list generator groups a user’s social contacts into topically coherent lists.
The list labeler synthesizes labels for those lists. The topic ranker learns a ranking model for each topic by using each list to
heuristically label training data.


   We propose two different labeling algorithms, using net-                   network generically describes the strength of the link be-
work as well as textual features (including list labels gen-                  tween two nodes. In principle, we can take the (unweighted,
erated by others, content, and user biographies). An ideal                    directed) ego-network to create a (weighted, undirected) in-
output for the list labeler is a topic string that is semanti-                put to the clustering algorithm, and then call each of the al-
cally close to the label a human would give to the same list.                 gorithm’s clusters a list.
We evaluate the list labeler’s output by comparing it to some                    Of course, the quality of clustering depends largely on the
simple synthetic baselines, as well as asking human judges                    network we formulate as input. By choosing edge weights
to rate its relevance.                                                        differently, we can obtain different kinds of clusterings. We
Topic Ranker The final component of B UTTERWORTH is                           have found that using weights that take into account shared
generating a ranking model for each identified topic. The                     topics leads to groupings that emphasize these topics while
topic ranker takes as input the past tweets from the set of                   de-emphasizing contextual relationships (family, childhood
users in each list that was labeled in the previous step. It                  friends, etc.) that are, for our purposes, “spurious.”
proceeds in two steps. First, it generates a label (“relevant”                   Each ego-network consists of a set of nodes, N , and a set
or “irrelevant”) for a subset of the user’s tweets. Second, it                of directed edges, E, where each edge indicates the pres-
uses this synthetically generated labeled data to train a naı̈ve              ence of a follower-followee relationship. For simplicity, we
Bayes model. Once a ranking model is trained for each topic,                  first convert each directed edge in E to an undirected edge.
the model can be applied to rank a user’s feed by the corre-                  Then, we use a combination of network features and textual
sponding topic. For example, after Alice selects the cooking                  features to produce E 0 , the set of weighted edges.
topic, her entire feed would be re-ordered such that the cook-                   For each pair of nodes (u, v), where u ∈ N and v ∈ N ,
ing tweets are pushed to the top of the list. Note that we pur-               we produce a weighted, undirected edge eu,v using a modi-
posely rank the entire feed to deal with both false-positive                  fication of the user similarity measure presented in (Adamic
and false-negative assignment of users in the list generation.                and Adar 2003):
   In order to train each ranker, we propose various heuristics
to automatically generate “relevant” and “irrelevant” labels
for training examples—a form of distant or self-supervised
                                                                                                        X                 1
                                                                                sim(u, v) =
learning. The main intuition behind these heuristics is that                                                        log[degree(x)]
                                                                                              x∈sharedneighbors
since the users contained in each list discuss similar topic(s),                            X
the most frequently discussed topics are most likely to be                         +                  tf idf (ut ) ∗ tf idf (vt ) + E(u, v), (1)
relevant. An ideal output of the ranker would order a user’s                           t∈sharedterm
feed such that all of the content relevant to the list appears at
the top of their feed. We use standard information retrieval                     where E(u, v) = 1 when eu,v ∈ E, and 0 otherwise.
techniques to evaluate the ranking quality.                                   If sim(u, v) > 0, then eu,v is added to E 0 with weight
                                                                              sim(u, v). To produce the “shared term” weights, we first
                        Algorithms                                            produce a TF-IDF-weighted term vector for each node n ∈
                                                                              N , limiting the per-user vocabulary to the 10 top-scoring
  Here we describe how we implement each of the compo-                        words. In examining the networks produced by our edge
nents above: the list generator, the labeler, and topic ranker.               weighting algorithms, we realized that many networks ap-
                                                                              peared extremely dense. To correct for this, we discard all
List Generation                                                               edges with weight less than a threshold parameter α.
   The goal of list generation is to take a user’s ego-network
and partition the friends into topically coherent lists. Fortu-               Graph Clustering After we have produced a weighted,
nately, partitioning the nodes of a graph into subsets is one                 undirected graph, we perform graph clustering to obtain a set
of the topics addressed by graph clustering research. In par-                 of lists. Currently, we apply a common approach based on
ticular, the algorithm of Pons and Latapy (Pons and Latapy                    random walks (Pons and Latapy 2005), as implemented in
2005) takes as input an undirected weighted graph, then pro-                  the iGraph R package. The clustering algorithm uses prop-
duces a disjoint set of node sets. An edge weight in the input                erties of random graph walks to produce a disjoint set of



                                                                      34
Table 1: The top three ranked tweets for automatically generated lists labeled environment, fashion, and sports (list labels are
also automatically generated).
               Environment Join us in helping get the 2012 Olympics off plastic bags!...
                                  Heading to Patagonia Santa Monica store to bring 5 Gyres display on plastic pollution..
                                  Starbucks Trash: Behind the Scenes :: My Plastic-free Life — Less Plastic...
                   Fashion        Anchors away in this Vintage Yellow Sailor dress! Newly listed...
                                  STUNNING Vintage Paisley Teal Spring Dress!...
                                  Vintage Silk Heart Blouse with a Tie Neck listed...
                    Sports        I posted 12 photos on Facebook in the album ”Warrior Around the NHL...
                                  LeBron James and Michael Jordan (92): are thus the only players to win NBA title...
                                  Denver Nuggets Sign Quincy Miller...


communities, and we consider each community produced as                 to decide when to switch from B EST OVERLAP to U SER I N -
a list.                                                                 FO B IGRAM .
   After identifying the lists, we must decide whether each
list and its members are topically cohesive. To do this, we             Topic Ranking
compute the entropy (Shannon 2001) of the list, in which
the list’s probability distribution is defined as a bag-of-words           The last step in the B UTTERWORTH pipeline is to build
model over all tweets in the list. Our intuition behind using           ranking models for each topic. The input for each ranking
entropy is that if a list’s tweets share common topics, then            model is the past tweets of each member of the correspond-
the distribution over words will be skewed to a small subset            ing list, comprising a set of unlabeled tweets T . Of course,
of the whole vocabulary and thus have low entropy. We clas-             these tweets are not labeled as “relevant” or “irrelevant.”
sify all lists with entropy lower than a empirically learned           However, we can exploit the fact that all of the tweets come
value as topical.                                                       from users grouped together in a single list. We propose var-
                                                                        ious heuristics for automatically labeling a subset of the ex-
Topic Labeling                                                          amples in T . Our learning scenario falls into the category of
                                                                        distant supervision, in which a heuristic labeling function H
   When generating a label for a topic list, we use one of              is applied over all of the examples in T to produce a labeled
two algorithms: the B EST OVERLAP method, or the U SER -                set TL ⊆ T . We only use H to try to infer positive train-
I NFO B IGRAM method. This specific choice was the result of            ing examples—obtaining high-quality negative examples is
experimenting with a variety of other techniques described              much easier. For each list, we randomly sample |TL | from
in the Experiments section.                                             the corpus of tweets not produced by users in the list. After
   In the B EST OVERLAP method, we exploit Twitter’s large              obtaining a labeled training set, we then extract the bag-of-
user base to implicitly “crowdsource” topic list labeling. For          words features from each training example and train a naı̈ve
each topical list, we create a set of candidate names by look-          Bayes model for each list. The final feed ranking is produced
ing at all previously-created Twitter lists that contain mem-           by sorting the tweets by their relevance probability, as scored
bers of our newly generated list. To label our new list, we             by the trained model for each list. Below we propose three
simply pick the name of the previously created list that max-           different variants of the labeling function H.
imally overlaps with the individuals in our list. For example,
if our list contained users A, B, and C and we find two other           Naı̈ve Method In the naı̈ve method we use all of the
previously created lists—“foodies,” which contains A and B              tweets produced by the list members as our positive train-
and “cooking,” which contains A, B, C, and D—we label our               ing set, and sample from out-of-list tweets for our negative
new list “cooking.” If multiple Twitter lists overlap equally,          training set. More formally, we let H be a constant func-
up to three names are concatenated to form the list label.              tion, labeling all of the examples in T as positive, to create
   For the U SER I NFO B IGRAM method, we examine the op-               TL = T . While this method is very simple, it achieves sur-
tional text that Twitter users can enter to describe them-              prisingly good results, as our experiments show.
selves (e.g. “I love NYC, tech & funk” or “CS PhD stu-
dent at the University of Rochester... My research involves             Top-K Hashtags and Unigrams By labeling all of the ex-
real-time crowdsourcing, human computation, and AI”). For               amples in T as positive, the naı̈ve method creates a noisy
each newly created list we generate a “corpus” of all user in-          training dataset. Instead, we would like a heuristic that tries
formation fields of list members. The list is then labeled with         to label as positive only the examples that are surely positive.
the most frequent bigram in this synthetic corpus.                      Here we propose heuristics that try to leverage the observa-
   We found through experimentation that the B EST OVER -               tion that the more prevalent content in T likely corresponds
LAP method works best when our generated lists have more                to the more relevant content to the end user. Instead of label-
members (increasing the chance of overlap and the size of               ing all of the examples in T as positive, we label a smaller
overlap with previously created lists). After considering var-          subset that contains examples that are the most likely to be-
ious limits, we use a minimum threshold of 10 list members              long to the positive class. We use a modified TF-IDF score



                                                                   35
                                                                                                     14
to find the unigrams and hashtags1 that are most likely to
be contained in the positive class. We score each hashtag or                                         12

unigram occurring in T using the following TF-IDF scoring                                            10
function for a given list l:

                                                                                   Number of Users
                                                                                                    8
                                            N
        T F ∗ IDF (w) = Fl (x) × log                ,    (2)                                          6
                                         IDF (x)
                                                                                                      4

   where Fl (x) is the number of occurrences of the hashtag
                                                                                                      2
or unigram w in the list l, N is the number of tweets in the
corpus and IDF (w) is the number of tweets that contain w.                                            0
                                                                                                          1   2   3   4   5   6   7   8   9   10   11   12   14   15   16   18   19   20
We define two heuristic functions, one for unigrams and one                                                                       Number of Created Lists
for hashtags. H labels all of the examples in T that contain
at least one of the top-k unigrams or hashtags, where k is a                Figure 2: Distribution of the number of lists created by users
chosen parameter.                                                           in the test set (20 is the maximum allowed by Twitter)

                        Experiments
                                                                               Each of the obtained lists, which we call organic lists,
  Below we describe a set of four experiments to test vari-                 has a user-given name (i.e., label) and a set of list mem-
ous aspects of B UTTERWORTH. All of our experiments use                     bers. Finally, we created an ego-network for each test user
data collected from Twitter which we describe below.                        that comprised all of the test user’s followers/followees, all
                                                                            members of a test user’s organic lists, and any friend rela-
Dataset Description                                                         tionships among these users. The average ego-network size
   In order to evaluate B UTTERWORTH, we need a ground-                     is 1383.72 and the median is 805. For our experiments we
truth dataset containing real users who have manually cre-                  downloaded up to 1,000 tweets from each user in the result-
ated their own lists. If our algorithmic list-generation com-               ing network.
ponent can accurately recreate these lists, and if we can use
the resulting lists to formulate accurate topic labels and rank-            List Generation
ings, then we can be confident that B UTTERWORTH will be                       To evaluate our list-generation algorithms, we experi-
effective in a general deployment.                                          mented with several alternative edge-weighting schemes.
   Unfortunately, it is not straightforward to find a random                For each ego user in our dataset, we produced one weighted,
sample of users that has created high quality lists. We ob-                 undirected ego-network graph for each weighting scheme.
tained such a sample from Twitter as follows:                               Next, we ran the clustering algorithm on each graph, pro-
                                                                            ducing a set of disjoint lists. Because all users in our dataset
1. We chose by hand a set of 10 high-quality lists drawn from               had at least one organic list, we evaluated the sets of lists
   www.listorius.com. They cover a range of topics, includ-                 produced by the community detection algorithm against the
   ing computer science, cooking, and others. Each list has                 user’s manually created organic lists. We evaluated the fol-
   between 300 and 500 users. Together, these users formed                  lowing weighting schemes: network only, in which the edge-
   a large seed set of users who are likely to be members of                weighting function sim(u, v) considers only the neighbors
   many lists.                                                              as features, and three additional schemes in which the edge-
2. We then obtained all lists that contained any of the seed                weighting function sim(u, v) considers neighbors and a
   users. This formed a large set of lists likely to be of high             TFIDF-weighted term vector as features, limiting the per-
   quality.                                                                 user vocabulary to k words, where k ∈ {10, 100, 1000}.
                                                                               We also tested the edge-weight parameter α with values
3. We found the creator of each list, yielding a set of nearly              that were functions of the average edge weight and stan-
   400,000 users. We have now found a subset of Twitter                     dard deviation for each network: α ∈ {1, average edge
   users who have created high-quality lists — this is exactly              weight - standard deviation, average edge weight, average
   the subset from which we want to draw our test sample.                   edge weight + standard deviation}. Figure 3 shows the re-
4. Last, we randomly sampled 100 users from the follower                    sults of this experiment. We see that taking k = 0 and α = (
   set, and removed users who were using private accounts                   average edge weight−standard deviation) results in the high-
   or who were non-English speakers. The resulting 80 users                 est value of F-measure, 0.83. Thus, we chose this algorithm
   formed the test-user set. These users had created any-                   as our edge-weighting scheme.
   where from 1 to 20 lists (mean of 7.79 and median of 7                      Our goal in this list-generation experiment was to pro-
   lists). Figure 2 shows the final distribution of lists created           duce lists that mimicked each user’s manually created or-
   by these test users.                                                     ganic lists. However, community finding was performed on
                                                                            each user’s entire ego-network, which included friends that
    1
     Hashtags are user-specified single-word descriptions that sig-         were not placed on any organic lists. Therefore, in evalu-
nal the topic of a tweet and always begin with a “#”, i.e., #Food or        ating the machine produced lists against the manually cre-
#Climate                                                                    ated organic lists, we created a confusion matrix for each



                                                                       36
                   1                                                   1
                                    network only                                            k = 10
                  0.9                                                 0.9
                  0.8
                  0.7
                                                                      0.8
                                                                      0.7
                                                                                                                    Table 2: RMSE and average relevance values for labeling
                  0.6                                                 0.6

       F1 Score
                  0.5
                                                           F1 Score
                                                                      0.5                                           algorithms.
                  0.4                                                 0.4
                  0.3                                                 0.3                                               Algorithm              RMSE Avg relevance
                  0.2                                                 0.2
                  0.1                                                 0.1                                                 B EST OVERLAP        6.79          1.72
                   0                                                   0
                        no cutoff   1        - sd   + sd                    no cutoff   1        - sd   + sd              L IST U NIGRAM       7.38            –
                   1
                  0.9
                                        k = 100
                                                                       1
                                                                      0.9
                                                                                            k = 1000                      T WEET U NIGRAM      7.54            –
                  0.8
                  0.7
                                                                      0.8
                                                                      0.7
                                                                                                                          T WEET B IGRAM       6.64          0.91
                  0.6                                                 0.6
                                                                                                                          T WEET W IKI         7.87            –
       F1 Score                                            F1 Score
                  0.5                                                 0.5
                  0.4
                  0.3
                                                                      0.4
                                                                      0.3
                                                                                                                          U SER I NFO U NIGRAM 7.35            –
                  0.2
                  0.1
                                                                      0.2
                                                                      0.1
                                                                                                                          U SER I NFO B IGRAM  6.56          1.14
                   0
                        no cutoff   1        - sd   + sd
                                                                       0
                                                                            no cutoff   1        - sd   + sd              U SER I NFOW IKI     7.52            –

Figure 3: F1 scores for the list-generation module, varying k
and α.                                                                                                              from all list members; (4) the T WEET B IGRAM method, in
                                                                                                                    which topic lists are labeled with the most common bigram
                                                                                                                    occurring in the past 1,000 tweets from all list members;
user as follows: for each pair of friends that was placed in                                                        (5) the T WEET W IKI method, in which we compute the top-
any organic list (f 1, f 2), the pair is a true positive if the                                                     5 unigrams occurring in the past 1,000 tweets from all list
friends were both placed in the same organic list, and were                                                         members, search Wikipedia with these unigrams, and la-
both placed in the same machine produced list; the pair is a                                                        bel the topic list with the most common unigram occur-
false positive if they were both placed in the same machine-                                                        ring in the parent categories for the top 10 search results;
produced list, but were not placed in the same organic list,                                                        (6) the U SER I NFO U NIGRAM method, in which topic lists
etc. We cannot include users who were not placed on any or-                                                         are labeled with the most common unigram occurring in the
ganic lists in our evaluation metrics because we do not know                                                        user info fields from all list members; (7) the U SER I NFO B I -
why they were not included in the list — they may belong                                                            GRAM method; and (8) the U SER I NFOW IKI method, which
on the list, but the user lazily left them off, or they truly do                                                    is identical to the tweet wiki method, but chooses the top-5
not belong. However, we will show in the next few sections                                                          unigrams occurring in the user info fields from all list mem-
that even with imperfect list generation, our results are still                                                     bers in the first step. Results from this experiment are pre-
quite good.                                                                                                         sented in Table 2.
   To evaluate our topicality threshold, we performed a 5-                                                             Because the B EST OVERLAP, T WEET B IGRAM, and
fold cross-validation on a set of 100 manually classified lists.                                                    U SER I NFO B IGRAM methods all had similarly low RMSE
Two human evaluators constructed the training and testing                                                           scores, we conducted a second evaluation, just using these
set by manually classifying 100 randomly chosen organic                                                             three algorithms. Our goal in this second evaluation was to
lists as either topical or non-topical. We then calculated the                                                      evaluate the meaningfulness and relevance of a label. Two
entropy of the lists, and learned an  cutoff value by choosing                                                     human evaluators manually classified each label for the 100
the cutoff to maximize the F-measure. Our final  value was                                                         random organic lists as very relevant (a score of 2), relevant
then chosen as the average of the 5 runs, yielding  = 1.374                                                        (a score of 1) or irrelevant (a score of 0) when compared
and F-measure = 0.92.                                                                                               with the organic list’s original label. These results are also
                                                                                                                    presented in Table 2. The B EST OVERLAP method outper-
Topic Labeling                                                                                                      forms the T WEET B IGRAM and U SER I NFO B IGRAM meth-
   We evaluated eight potential labeling algorithms be-                                                             ods significantly (p < .01). Although the U SER I NFO B I -
fore choosing the B EST OVERLAP and U SER I NFO B IGRAM                                                             GRAM method appears to outperform the T WEET B IGRAM
methods, described in the Algorithms section. We performed                                                          method, the difference is not significant.
two experiments to evaluate these algorithms. First, we
chose a random sample of 100 organic lists from our dataset.                                                        Topic Ranking
For each list, we produced 8 labels—one from each label-                                                               In order to evaluate the ranking, we needed to obtain
ing algorithm. To evaluate how similar each label was to the                                                        ground truth about the relevance of tweets to the topic name
organic list’s original label, we computed the pointwise mu-                                                        of a list. We randomly sampled 100 organic lists from the
tual information (PMI) score of each label, relative to the                                                         test user set for which we wanted to obtain labels. We used
original label. To compare all labeling techniques, we then                                                         Amazon’s Mechanical Turk to obtain binary labels of rele-
calculated the root mean squared error (RMSE) of each al-                                                           vant or irrelevant to a prescribed list name. For each of the
gorithm’s PMI scores.                                                                                               100 organic lists we sampled 100 tweets, and asked three
   The algorithms we evaluated were: (1) the B EST OVER -                                                           Mechanical Turk workers (“Turkers”) to grade whether a
LAP method; (2) the L IST U NIGRAM method, in which topic                                                           tweet was relevant to the list name or not. Since the list
lists are labeled with the most common unigram from the                                                             names were generated for personal use by Twitter users,
names of all previously created Twitter lists; (3) the T WEET-                                                      some were less informative (e.g., “mac,” “vegas tweeple”),
U NIGRAM method, in which topic lists are labeled with the                                                          and as a result the Turkers were not able to give high-quality
most common unigram occurring in the past 1,000 tweets                                                              ratings. Since we only gave the Turkers two options, for the



                                                                                                               37
                     1

                   0.95
                                                                                                                           Table 3: Precision at k.
                    0.9                                                                                          precision@k unigram (k = 8)            baseline
                   0.85
                                                                                                                       1               0.77               0.52
                    0.8
                                                                                                                       5               0.76               0.46
       Precision
                   0.75
                                                                                                                       7               0.76               0.44
                    0.7

                   0.65
                                                                                                                      10               0.78               0.45
                    0.6

                   0.55

                    0.5                                                                                  performs well.
                          0      0.1     0.2      0.3   0.4       0.5   0.6   0.7   0.8   0.9   1
                                                         Recall
                                                                                                         Robustness to Noise The previous experiments tested the
                              baseline         naïve    hashtag (k=100)        unigram (k=8)
                                                                                                         proposed methods on user-generated lists, which we assume
                                                                                                         are high quality. Since part of B UTTERWORTH’s purpose is
Figure 4: Precision and recall of the hashtag, unigram, naı̈ve                                           to automatically generate lists, we also wanted to see how
ranking methods against a baseline.                                                                      sensitive each of the methods were to varying levels of noise.
                                                                                                         We simulated mistakes in list generation by replacing a vary-
                                                                                                         ing percentage of tweets in each test list with random tweets
incoherent list names the vast majority of the answers se-                                               from outside the list. For example, a noise level of 30%
lected were “irrelevant,” as the Turkers did not understand                                              for a given list would correspond to 30% of the tweets in
the list name. We used for ranking only those lists for which                                            the training set being replaced with random tweets sampled
Turkers unanimously agreed that at least 15% of tweets were                                              from users outside the list. Figure 6 shows the precision-
relevant. After filtering out lists with incoherent names, we                                            recall plots for all three methods with various levels of noise.
obtained a set of 55 lists that we used for testing. From each                                           We can see that the naı̈ve method is the most robust to in-
list, we used only the examples to which the Turkers re-                                                 creasing levels of noise—it is only truly affected at levels
sponded unanimously, yielding a total of 3,215 labeled ex-                                               of noise above 70%. The other methods are more affected
amples. The mean percentage of relevant tweets over the 55                                               by noise, likely because they quickly begin to only include
lists was 52%. We evaluated the performance of the ranking                                               hashtags/unigrams that correspond to irrelevant topics.
models using standard information retrieval metrics.
   Our first set of experiments test the effect of the k param-
                                                                                                         End-to-end Experiment
eter for the hashtag and unigram methods. We then com-
pare the hashtag, unigram, and naı̈ve methods against a base-                                               The previous experiments evaluated each component of
line. We show the robustness of each heuristic under various                                             B UTTERWORTH in isolation, but we have yet to test the ef-
amounts of noise in order to determine the sensitivity of the                                            fectiveness of B UTTERWORTH as a whole. In order to test
ranking module to the output of the list-generation module.                                              B UTTERWORTH as a complete system, we need to experi-
                                                                                                         ment on an end-to-end workflow that tests the quality of the
Tuning the k parameter Figures 5 show the Mean Av-                                                       rankers given generated lists and their labels from the list
erage Precision (MAP) scores for various values of the k                                                 generator and list labeler, respectively. We propose an ex-
parameter. As the plots show, the MAP scores do not vary                                                 periment with the following workflow:
much between the different k values. As long as we choose
a k value that is not very small, the performance of the ranker                                          1. Randomly select 100 generated topical lists (from our set
is consistently good. When k is too small, the naı̈ve Bayes                                                 of test users) that contain at least 5 members
model is not supplied enough training data and performance                                               2. Label each of the 100 generated topical lists using the B E -
suffers. We choose k = 8 (unigram) and k = 100 (hashtag)                                                    ST OVERLAP list-labeling algorithm
for the following experiments, as those values performed
slightly better than others.                                                                             3. Use the unigram (at k=8) topic ranker to rank a random
                                                                                                            sampling of 100 tweets from each of the generated lists
Comparing Proposed Methods to Baseline By default                                                           and output the top 10 ranked results. For a baseline, we
Twitter ranks a user’s feed in reverse chronological order, so                                              also output 10 randomly ordered tweets.
we compared our method against this baseline. Ranking the
tweets by time is essentially the same as randomly order-                                                   To evaluate the results of this experiment, we employed
ing with respect to their topical relevance. Figure 4 shows                                              three human evaluators to score the top 10 results from both
the precision-recall curves for the naı̈ve, hashtag, and un-                                             the baseline and the topic ranker. We present the results from
igram methods as compared to the baseline. As shown in                                                   this experiment in Table 3. As we can see, the topic ranker
the figure, our methods significantly outperform the base-                                               greatly outperforms the baseline, with 78% precision@k,
line, which quickly converges to a precision of around 50%,                                              compared with 45% precision@k achieved by the baseline.
which is the average percentage of relevant topics over all                                              Table 1 shows a few examples of B UTTERWORTH’s output.
lists. All three of our proposed methods have a very similar                                                We can compare the average precision achieved by the
performance, in which the unigram method slightly outper-                                                baseline, 45%, with the average rate of relevant tweets
forms the other two methods. The naı̈ve Bayes classifier is                                              found in organic lists—52%. These very similar rates indi-
robust to noise, so it is not surprising that the naı̈ve method                                          cate that the topical lists generated by the list- generation



                                                                                                    38
                               0.9
                              0.88
                              0.86
                              0.84
                              0.82



                  MAP Score
                               0.8
                              0.78
                              0.76
                              0.74
                              0.72
                               0.7
                                       1    5   10   25   50 100 150 200 250 300 350 400               2    4      6      8     10   15   20   25    50   75   100


                                      Figure 5: Varying the k parameter for the hashtag (left) and unigram (right) methods.
                              1
                                                                   naïve                                        hashtag                                   unigram
                          0.9


              Precision
                          0.8
                          0.7
                          0.6
                          0.5
                                  0                   0.5                  1 0                  0.5                       1 0                  0.5                   1
                                                     Recall
                                                                                 10%       50%             70%         90%

Figure 6: A comparison of the effects of varying the percentage of noise on precision and recall for the naı̈ve, hashtag, and
unigram methods.


module mimic the quality and topical coherence of human-                                              interface would enable the user to apply the cooking-ranker
constructed lists. Because there are many components in                                               to just a specific friend, just the generated list of cooking
B UTTERWORTH’s pipeline, there is a high potential for er-                                            friends, or to their entire set of friends. To test the feasibility
ror propagation and compounding. However, we can see                                                  of this modified interface we re-ran the end-to-end experi-
that B UTTERWORTH performs quite well, maintaining high-                                              ment (Table 3) using a user’s entire feed as input to each
quality ranking despite potential noise in list generation.                                           ranker. We found that B UTTERWORTH performs slightly
                                                                                                      better, giving 82% precision@10. This slight improvement
                                           Discussion                                                 may be due to the fact that B UTTERWORTH can find the
                                                                                                      “best” tweets on a given topic regardless of who produced
   While B UTTERWORTH performs well for the general sce-                                              them. In some cases, these may be as good or better than
narios we experimented with, there are some user cases                                                those produced by list members.
which require adaptation of the strategies we employ. Cur-                                               A second potential issue with B UTTERWORTH is linked
rently, B UTTERWORTH places each friend in exactly one                                                to our user interaction model. Our system explicitly ranks a
cluster (i.e., a hard-clustering). If a friend tweets about mul-                                      user’s feed by topics of their interest and therefore loses tem-
tiple topics of interest to the user, then the clustering pro-                                        poral ordering. We believe this issue can also be fixed with
cedure will identify only one of these interests. We propose                                          a modified interface design that surfaces B UTTERWORTH’s
two possible solutions to this problem. First, we could sim-                                          ranking in a different way. Instead of completely reordering
ply modify our clustering algorithm to allow friends to be                                            a users feed on a page, we propose an interface that uses the
part of many clusters (e.g., through soft- or hierarchical-                                           generated rankers to color the tweets in a user’s temporally-
clustering). Figure 6 demonstrates that B UTTERWORTH is                                               oriented feed. Thus, the salience of a tweet in the feed would
capable of ranking well under noisy list generation. Thus,                                            vary based on the score that the ranker produces for each
we believe the potentially noisier clusters produced by a                                             tweet. This interface would allow a user to view both topi-
fuzzy clustering algorithm would not drastically affect rank-                                         cally and temporally relevant content.
ing quality.
   Instead of modifying our clustering algorithm, we could
alternatively use the ranker on all tweets rather than those
                                                                                                                                      Conclusion
produced by a specific list. A solution at the interface level                                         We have a few ideas about how to improve B UTTER -
would enable users to choose the set of friends to which the                                          WORTH ’s future performance. First, users who have over-
ranker would be applied. For instance, if B UTTERWORTH                                                lapping interests may also build overlapping lists, write sim-
detected that the user is interested in cooking, the modified                                         ilar text, retweet related content, and link to similar URLs;



                                                                                           39
the list-generation step should thus incorporate information          Fang, L.; Fabrikant, A.; and LeFevre, K. 2012. Look who
sources beyond network structure. Second, each social net-            I found: Understanding the effects of sharing curated friend
working site has some particular features — say, privacy set-         groups. In WebSci’12, 137–146.
tings unavailable in other systems—that might shed addi-              Guc, B. 2010. Information Filtering on Micro-blogging Ser-
tional light on how to construct better lists, which we should        vices. In Master’s Thesis. Swiss Federal Institute of Tech-
exploit. In addition, now that we have constructed a robust           nology Zürich.
back-end architecture, we have begun to consider the design
                                                                      Hong, L., and Davison, B. 2010. Empirical study of topic
of the UI for B UTTERWORTH. The mechanism by which the
                                                                      modeling in Twitter. In Proceedings of the First Workshop
user accesses lists (manually created and automated, topical,
                                                                      on Social Media Analytics, 80–88. ACM.
and contextual), provides feedback, controls lists and rank-
ing behavior can, and should, be taken into account to create         Hong, L.; Convertino, G.; Suh, B.; Chi, E. H.; and Kairam,
a usable user experience. The interactions of the user with           S. 2010. FeedWinnower: layering structures over collections
the system can be utilized to further inform the intelligent          of information streams. In CHI ’10, 947–950.
components of B UTTERWORTH.                                           Hong, L.; Bekkerman, R.; Adler, J.; and Davison, B. 2012.
   In this work we have described B UTTERWORTH, a sys-                Learning to rank social update streams. In SIGIR’12.
tem for automatically performing topic-sensitive grouping             Kim, D.; Jo, Y.; Moon, I.-C.; and Oh, A. 2010. Analysis of
and ranking of the messages in a user’s social feed. Unlike           Twitter lists as a potential source for discovering latent char-
existing approaches for message ranking, B UTTERWORTH                 acteristics of users. In Workshop on Microblogging at the
requires no explicit guidance from the user and works across          ACM Conference on Human Factors in Computer Systems.
a spectrum of users and scales. By breaking apart the simple          (CHI 2010).
“follow” relationship into multiple topical lists, B UTTER -
                                                                      Lin, J.; Snow, R.; and Morgan, W. 2011. Smoothing tech-
WORTH addresses the context collapse problem. By lever-
                                                                      niques for adaptive online language models: topic tracking
aging each of these lists to generate rankers that can be ap-
                                                                      in tweet streams. In KDD’11, 422–429. ACM.
plied to the user’s feed, the system alleviates channel col-
lapse. This is achieved through use of a novel architecture           Paek, T.; Gamon, M.; Counts, S.; Chickering, D. M.; and
that leverages a user’s social network. By weighting this net-        Dhesi, A. 2010. Predicting the importance of newsfeed posts
work to encourage topical sub-community extraction, B UT-             and social network friends. In AAAI’10, 1419–1424.
TERWORTH is able to identify groups of users that share a             Pal, A., and Counts, S. 2011. Identifying topical authorities
common interest. The lists generated by B UTTERWORTH are              in microblogs. In WSDM’11, 45–54.
accurately labeled, and the rankers trained from these lists          Pons, P., and Latapy, M. 2005. Computing communities
improve the relevance of a feed from 45% to 78%.                      in large networks using random walks. In Computer and
                                                                      Information Sciences - ISCIS 2005, volume 3733 of Lecture
                  Acknowledgements                                    Notes in Computer Science.
  The authors would like to thank Avishay Livne for help in           Ramage, D.; Dumais, S.; and Liebling, D. 2010. Character-
collecting data for this project, Qiaozhu Mei for helpful dis-        izing microblogs with topic models. In WDSM’10.
cussions, Andrea Pellegrini for help with formatting figures
                                                                      Shannon, C. E. 2001. A mathematical theory of communica-
and the anonymous reviewers for their helpful comments.
                                                                      tion. SIGMOBILE Mob. Comput. Commun. Rev. 5(1):3–55.
This work was supported by National Science Foundation
grant IGERT-0903629.                                                  Sriram, B.; Fuhry, D.; Demir, E.; Ferhatosmanoglu, H.; and
                                                                      Demirbas, M. 2010. Short text classification in Twitter to
                       References                                     improve information filtering. In SIGIR ’10, 841–842.
Adamic, L. A., and Adar, E. 2003. Friends and neighbors               Tseng, C.-Y.; Chen, Y.-J.; and Chen, M.-S. 2012. Socfeed-
on the web. Social Networks 25(3):211 – 230.                          viewer: A novel visualization technique for social news
Bernstein, M. S.; Suh, B.; Hong, L.; Chen, J.; Kairam, S.;            feeds summarization on social network services. In Web Ser-
and Chi, E. H. 2010. Eddi: interactive topic-based browsing           vices (ICWS), 2012 IEEE 19th International Conference on,
of social status streams. In UIST’10, 303–312.                        616 –617.
Boyd-Graber, J.; Chang, J.; Gerrish, S.; Wang, C.; and Blei,          Uysal, I., and Croft, W. B. 2011. User oriented tweet rank-
D. 2009. Reading tea leaves: How humans interpret topic               ing: a filtering approach to microblogs. In CIKM ’11, 2261–
models. In NIPS’09.                                                   2264.
Dahimene, R.; Mouza, C.; and Scholl, M. 2012. Efficient               Wagner, C.; Liao, V.; Pirolli, P.; Nelson, L.; and Strohmaier,
filtering in micro-blogging systems: We won’t get flooded             M. 2012. It’s not in their tweets: Modeling topical expertise
again. In Ailamaki, A., and Bowers, S., eds., Scientific              of Twitter users. SocialCom ’12.
and Statistical Database Management, volume 7338 of Lec-              Xu, Z.; Lu, R.; Xiang, L.; and Yang, Q. 2011. Discovering
ture Notes in Computer Science. Springer Berlin Heidelberg.           user interest on Twitter with a modified author-topic model.
168–176.                                                              In WI-IAT’11, volume 1, 422 –429.
Das Sarma, A.; Das Sarma, A.; Gollapudi, S.; and Panigrahy,
R. 2010. Ranking mechanisms in Twitter-like forums. In
WSDM’10, 21–30.



                                                                 40
