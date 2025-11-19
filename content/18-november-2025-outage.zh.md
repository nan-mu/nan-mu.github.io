+++
title = "2025年11月18日 Cloudflare 故障 - 官方博文翻译 - 机翻人工校对" 
date = 2025-11-19
description = '''Cloudflare outage on November 18, 2025 - 官方博文翻译 - 机翻人工校对'''
+++

原文请参考 [Cloudflare outage on November 18, 2025](https://blog.cloudflare.com/18-november-2025-outage/)。

本文为非官方中文翻译，仅供参考，请以 Cloudflare 官方原文为准。
译文仅供参考，如与原文存在歧义或差异，以原文为准。译者不对因译文使用产生的任何法律责任承担直接责任。
原文版权归 Cloudflare 所有。

<!-- more -->

On 18 November 2025 at 11:20 UTC (all times in this blog are UTC), Cloudflare's network began experiencing significant failures to deliver core network traffic. This showed up to Internet users trying to access our customers' sites as an error page indicating a failure within Cloudflare's network.

在北京时间2025年11月18日18点20分，UTC时间11点20分，Cloudflare网络初见严重故障，无法正常传输核心网络流量。尝试访问我们客户网站的用户会看到一个错误页面，提示Cloudflare 网络出现故障。

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3ony9XsTIteX8DNEFJDddJ/7da2edd5abca755e9088002a0f5d1758/BLOG-3079_2.png" 
  alt="HTTP error page displayed during the incident"
  style="max-width: 100%; height: auto; display: block;" />

**The issue was not caused, directly or indirectly, by a cyber attack or malicious activity of any kind.** Instead, it was triggered by a change to one of our database systems' permissions which caused the database to output multiple entries into a “feature file” used by our Bot Management system. That feature file, in turn, doubled in size. The larger-than-expected feature file was then propagated to all the machines that make up our network.

**这一问题并非直接或间接地由任意形式地网络攻击或恶意活动所导致。**相反它被一次我们地数据库系统权限更改所触发，这使数据库向我们地机器人管理系统使用地功能配置文件输出了大量条目。因此该配置文件的大小翻倍并分发到我们网络中的所有机器上。

The software running on these machines to route traffic across our network reads this feature file to keep our Bot Management system up to date with ever changing threats. The software had a limit on the size of the feature file that was below its doubled size. That caused the software to fail.

这些机器上运行的路由软件会读取这个配置文件以便于及时更新来应对不断变化的威胁。然而该软件会限制配置文件的大小，大于两倍大小的文件将导致软件运行失败。

After we initially wrongly suspected the symptoms we were seeing were caused by a hyper-scale DDoS attack, we correctly identified the core issue and were able to stop the propagation of the larger-than-expected feature file and replace it with an earlier version of the file. Core traffic was largely flowing as normal by 14:30. We worked over the next few hours to mitigate increased load on various parts of our network as traffic rushed back online. As of 17:06 all systems at Cloudflare were functioning as normal.

在最初我们误以为观察到的错误是由大规模DDoS攻击引起的之后，我们随即正确地找到了问题的根源并组织异常大小的配置文件传播，然后将其替换为一个早期的版本。到北京时间18日下午10点30分，核心流量基本恢复正常。接下来的几个小时我们努力缓解网络各部分因流量恢复而增加的负载。截至北京时间19日凌晨1点06分，Cloudflare的所有系统均已恢复正常运行。

We are sorry for the impact to our customers and to the Internet in general. Given Cloudflare's importance in the Internet ecosystem any outage of any of our systems is unacceptable. That there was a period of time where our network was not able to route traffic is deeply painful to every member of our team. We know we let you down today.

我们对此次事件给客户和整个互联网带来的影响深表歉意。鉴于 Cloudflare 在互联网生态系统中的重要性，任何系统故障都是不可接受的。我们的网络一度无法正常路由流量，这令我们团队的每一位成员都感到非常痛心。我们知道今天让您感到失望了。

This post is an in-depth recount of exactly what happened and what systems and processes failed. It is also the beginning, though not the end, of what we plan to do in order to make sure an outage like this will not happen again.

这篇文章详细记述了事件经过以及哪些系统和流程出现故障。它也是我们为确保此类故障不再发生而计划采取的措施的开始，但并非结束。

## The outage 故障

The chart below shows the volume of 5xx error HTTP status codes served by the Cloudflare network. Normally this should be very low, and it was right up until the start of the outage.

下图显示了 Cloudflare 网络处理的 5xx 错误 HTTP 状态码的数量。通常情况下，这个数量应该非常低，而且在服务中断开始之前确实如此。

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7GdZcWhEqNjwOmLcsKOXT0/fca7e6970d422d04c81b2baafb988cbe/BLOG-3079_3.png" 
  alt="Volume of HTTP 5xx requests served by the Cloudflare network"
  style="max-width: 100%; height: auto; display: block;" />

The volume prior to 11:20 is the expected baseline of 5xx errors observed across our network. The spike, and subsequent fluctuations, show our system failing due to loading the incorrect feature file. What’s notable is that our system would then recover for a period. This was very unusual behavior for an internal error.

北京时间18日上午11点20分之前的流量是我们网络中 5xx 错误预期基线水平。流量峰值及其后的波动表明，我们的系统由于加载了错误的特征文件发生了故障。值得注意的是，系统随后会恢复一段时间。对于一个内部错误，这种行为非常不寻常。

The explanation was that the file was being generated every five minutes by a query running on a ClickHouse database cluster, which was being gradually updated to improve permissions management. Bad data was only generated if the query ran on a part of the cluster which had been updated. As a result, every five minutes there was a chance of either a good or a bad set of configuration files being generated and rapidly propagated across the network.

这一现象的解释是，该文件由 ClickHouse 数据库集群上运行的查询程序每五分钟生成一次，这将逐步更新以更新权限管理。只有当查询在集群中已更新的设备运行时，才会生成错误数据。因此，每五分钟都有可能生成一组正确的或错误的配置文件，并迅速在网络中传播。

This fluctuation made it unclear what was happening as the entire system would recover and then fail again as sometimes good, sometimes bad configuration files were distributed to our network. Initially, this led us to believe this might be caused by an attack. Eventually, every ClickHouse node was generating the bad configuration file and the fluctuation stabilized in the failing state.

这种波动导致整个系统会时而恢复，时而再次崩溃，有时是正常的配置文件，有时是错误的配置文件，两种文件都有可能被分发到我们的网络中。起初，这导致我们怀疑是网络攻击造成了这一切。而最后，每个 ClickHouse 节点都生成了错误的配置文件，系统也稳定在了故障状态。

Errors continued until the underlying issue was identified and resolved starting at 14:30. We solved the problem by stopping the generation and propagation of the bad feature file and manually inserting a known good file into the feature file distribution queue. And then forcing a restart of our core proxy.

在这个过程中错误持续出现，直到北京时间18日下午8点30分我们找到并解决了根本问题。我们通过停止生成和传播错误配置文件，并手动将一个被认为是正常的配置文件插入配置文件分发队列，然后强制重启核心代理来解决了这个问题。

The remaining long tail in the chart above is our team restarting remaining services that had entered a bad state, with 5xx error code volume returning to normal at 17:06.

上图中剩余的长尾是我们的团队重新启动了不良状态的剩余服务，5xx 错误代码量在北京时间19日凌晨1点06分恢复正常。

The following services were impacted:

以下服务受到影响：

| 服务/产品           | Service / Product              | 影响描述                                                     | Impact description                                           |
| ------------------- | ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 核心 CDN 和安全服务 | Core CDN and security services | HTTP 5xx 状态码。本文顶部的屏幕截图显示了最终用户看到的常见错误页面。 | HTTP 5xx status codes. The screenshot at the top of this post shows a typical error page delivered to end users. |
| Turnstile           | Turnstile                      | Turnstile 加载失败。                                         | Turnstile failed to load.                                    |
| Workers KV          | Workers KV                     | 由于核心代理出现故障，导致对 KV前端网关的请求失败，Workers KV 返回了 明显偏高的 HTTP 5xx 错误数量。 | Workers KV returned a significantly elevated level of HTTP 5xx errors as requests to KV’s “front end” gateway failed due to the core proxy failing. |
| 仪表板              | Dashboard                      | 虽然仪表盘基本可以正常运行，但由于登录页面上 Turnstile 不可用，大多数用户无法登录。 | While the dashboard was mostly operational, most users were unable to log in due to Turnstile being unavailable on the login page. |
| 电子邮件安全        | Email Security                 | 虽然邮件处理和投递未受影响，但我们观察到对某个 IP 信誉源的访问暂时中断，这导致垃圾邮件检测准确率降低，并阻止了部分新域名年龄检测的触发。这一切未对客户造成重大影响。此外，部分自动移动操作也出现故障；所有受影响的邮件均已审核并修复。 | While email processing and delivery were unaffected, we observed a temporary loss of access to an IP reputation source which reduced spam-detection accuracy and prevented some new-domain-age detections from triggering, with no critical customer impact observed. We also saw failures in some Auto Move actions; all affected messages have been reviewed and remediated. |
| Access              | Access                         | 从事件发生之初到北京时间下午9点05分启动回滚程序之前，大多数用户都普遍遇到了身份验证失败的情况。任何现有的 Access 会话均未受到影响。 <br /><br />所有身份验证失败的尝试都导致出现错误页面，这意味着在身份验证失败期间，这些用户根本没法访问目标应用程序。在此期间，所有成功的登录都已正确记录。<br /><br />当时尝试的任何 Access 配置更新要么会直接失败，要么传播速度非常慢。所有配置更新现已恢复。 | Authentication failures were widespread for most users, beginning at the start of the incident and continuing until the rollback was initiated at 13:05. Any existing Access sessions were unaffected. <br /><br />All failed authentication attempts resulted in an error page, meaning none of these users ever reached the target application while authentication was failing. Successful logins during this period were correctly logged during this incident.  <br /><br />Any Access configuration updates attempted at that time would have either failed outright or propagated very slowly. All configuration updates are now recovered. |

## How Cloudflare processes requests, and how this went wrong today Cloudflare 如何处理请求，以及今天出了什么问题。

Every request to Cloudflare takes a well-defined path through our network. It could be from a browser loading a webpage, a mobile app calling an API, or automated traffic from another service. These requests first terminate at our HTTP and TLS layer, then flow into our core proxy system (which we call FL for “Frontline”), and finally through Pingora, which performs cache lookups or fetches data from the origin if needed.

每个发送到 Cloudflare 的请求都会沿着我们网络中预设的路径进行。这些请求可能来自加载网页的浏览器、调用 API 的移动应用，或是来自其他服务的自动请求流量。这些请求首先在我们的 HTTP 和 TLS 层被介入，然后流入我们的核心代理系统（我们称之为 FL，即“Frontline”），最后通过 Pingora。Pingora 会根据需要进行缓存查询或从源服务器获取数据。

We previously shared more detail about how the core proxy works [here](https://blog.cloudflare.com/20-percent-internet-upgrade/). 

我们之前[在这里](https://blog.cloudflare.com/20-percent-internet-upgrade/)分享了有关核心代理工作原理的更多细节。

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6qlWXM3gh4SaYYvsGc7mFV/99294b22963bb414435044323aed7706/BLOG-3079_4.png" 
  alt="Diagram of our reverse proxy architecture"
  style="max-width: 100%; height: auto; display: block;" />

As a request transits the core proxy, we run the various security and performance products available in our network. The proxy applies each customer’s unique configuration and settings, from enforcing WAF rules and DDoS protection to routing traffic to the Developer Platform and R2. It accomplishes this through a set of domain-specific modules that apply the configuration and policy rules to traffic transiting our proxy.

当请求经过核心代理时，我们会运行网络中可用的各种安全和性能产品。代理程序会使用每个客户的独特配置和设置，从强制执行 WAF 规则和 DDoS 防护到将流量路由到开发者平台和 R2。它通过一组基于域的模块来实现这一点，这些模块会将配置和策略规则应用于经过我们代理的流量。

One of those modules, Bot Management, was the source of today’s outage. 

其中一个模块——机器人管理模块——是造成今天系统故障的根源。

Cloudflare’s [Bot Management](https://www.cloudflare.com/application-services/products/bot-management/) includes, among other systems, a machine learning model that we use to generate bot scores for every request traversing our network. Our customers use bot scores to control which bots are allowed to access their sites — or not.

Cloudflare 的[bot管理功能](https://www.cloudflare.com/application-services/products/bot-management/)包含多种系统，其中包括一个机器学习模型，我们使用该模型为通过我们网络的每个请求生成bot进行评估。我们的客户使用bot评估来控制哪些bot可以访问他们的网站，哪些bot则不能。

The model takes as input a “feature” configuration file. A feature, in this context, is an individual trait used by the machine learning model to make a prediction about whether the request was automated or not. The feature configuration file is a collection of individual features.

该模型以“特征”配置文件作为输入。在此上下文中，“特征”是指机器学习模型用于预测请求是否为自动化请求的个体属性。特征配置文件是各个特征的集合。

This feature file is refreshed every few minutes and published to our entire network and allows us to react to variations in traffic flows across the Internet. It allows us to react to new types of bots and new bot attacks. So it’s critical that it is rolled out frequently and rapidly as bad actors change their tactics quickly.

此配置文件每隔几分钟就会刷新一次，并发布到我们的整个网络，使我们能够应对互联网流量的变化。它使我们能够应对新型bot和新型bot攻击。因此，频繁且快速地部署此功能至关重要，因为恶意行为者的策略变化迅速。

A change in our underlying ClickHouse query behaviour (explained below) that generates this file caused it to have a large number of duplicate “feature” rows. This changed the size of the previously fixed-size feature configuration file, causing the bots module to trigger an error.

由于我们底层 ClickHouse 查询行为的更改（详见下文），导致生成此文件的查询中出现大量重复的“feature”行。这改变了之前固定大小的 feature 配置文件的大小，从而导致bot模型触发错误。

As a result, HTTP 5xx error codes were returned by the core proxy system that handles traffic processing for our customers, for any traffic that depended on the bots module. This also affected Workers KV and Access, which rely on the core proxy.

因此，负责处理客户流量的核心代理系统对所有依赖于机器人模块的流量都返回了 HTTP 5xx 错误代码。这也影响了依赖于该核心代理的 Workers KV 和 Access 服务。

Unrelated to this incident, we were and are currently migrating our customer traffic to a new version of our proxy service, internally known as [FL2](https://blog.cloudflare.com/20-percent-internet-upgrade/). Both versions were affected by the issue, although the impact observed was different.

与此事件无关，我们正在将客户流量迁移到新版本的代理服务（内部代号 [FL2](https://blog.cloudflare.com/20-percent-internet-upgrade/) ）。两个版本都受到了该问题的影响，但影响程度有所不同。

Customers deployed on the new FL2 proxy engine, observed HTTP 5xx errors. Customers on our old proxy engine, known as FL, did not see errors, but bot scores were not generated correctly, resulting in all traffic receiving a bot score of zero. Customers that had rules deployed to block bots would have seen large numbers of false positives. Customers who were not using our bot score in their rules did not see any impact.

使用全新 FL2 代理引擎的客户观察到了 HTTP 5xx 错误。使用旧版代理引擎 FL 的客户虽然没有遇到错误，但机器人评分生成不正确，导致所有流量的机器人评分均为零。已部署规则阻止机器人的客户会看到大量误报。未在其规则中使用机器人评分的客户则未受到任何影响。

Throwing us off and making us believe this might have been an attack was another apparent symptom we observed: Cloudflare’s status page went down. The status page is hosted completely off Cloudflare’s infrastructure with no dependencies on Cloudflare. While it turned out to be a coincidence, it led some of the team diagnosing the issue to believe that an attacker may be targeting both our systems as well as our status page. Visitors to the status page at that time were greeted by an error message:

另一个明显的症状让我们误以为这是一次攻击：Cloudflare 的状态页面宕机了。该状态页面完全托管在 Cloudflare 的基础设施之外，不依赖于 Cloudflare。虽然最终证实这只是巧合，但它让参与问题诊断的团队成员开始怀疑攻击者可能同时针对我们的系统和状态页面。当时访问状态页面的用户会看到一条错误信息：

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7LwbB5fv7vdoNRWWDGN7ia/dad8cef76eee1305e0216d74a813612b/BLOG-3079_5.png" 
  alt="Error on the Cloudflare status page"
  style="max-width: 100%; height: auto; display: block;" />

In the internal incident chat room, we were concerned that this might be the continuation of the recent spate of high volume [Aisuru](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/defending-the-cloud-azure-neutralized-a-record-breaking-15-tbps-ddos-attack/4470422) [DDoS attacks](https://blog.cloudflare.com/defending-the-internet-how-cloudflare-blocked-a-monumental-7-3-tbps-ddos/):

在内部事件聊天室中，我们担心这可能是近期 [Aisuru](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/defending-the-cloud-azure-neutralized-a-record-breaking-15-tbps-ddos-attack/4470422) 高流量 [DDoS 攻击](https://blog.cloudflare.com/defending-the-internet-how-cloudflare-blocked-a-monumental-7-3-tbps-ddos/)的延续：

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3Ph13HSsOGC0KYRfoeZmSy/46522e46ed0132d2ea551aef4c71a5d6/BLOG-3079_6.png" 
  alt="Internal chat screenshot"
  style="max-width: 100%; height: auto; display: block;" />

### The query behaviour change 查询行为变化

I mentioned above that a change in the underlying query behaviour resulted in the feature file containing a large number of duplicate rows. The database system in question uses ClickHouse’s software.

我前面提到过，底层查询行为的改变导致特征文件中出现大量重复行。涉事数据库系统使用的是 ClickHouse 的软件。

For context, it’s helpful to know how ClickHouse distributed queries work. A ClickHouse cluster consists of many shards. To query data from all shards, we have so-called distributed tables (powered by the table engine `Distributed`) in a database called `default`. The Distributed engine queries underlying tables in a database `r0`. The underlying tables are where data is stored on each shard of a ClickHouse cluster.

为了更好地理解，了解 ClickHouse 分布式查询的工作原理很有帮助。ClickHouse 集群由多个分片组成。为了查询所有分片中的数据，我们在名为 `default` 数据库中使用了所谓的分布式表（由 `Distributed` 表引擎驱动）。Distributed 引擎查询数据库 `r0` 中的底层表。ClickHouse 集群中每个分片上的数据都存储在这些底层表中。

Queries to the distributed tables run through a shared system account. As part of efforts to improve our distributed queries security and reliability, there’s work being done to make them run under the initial user accounts instead.

对分布式表的查询目前通过共享系统帐户运行。为了提高分布式查询的安全性和可靠性，我们正在努力使其改用初始用户帐户运行。

Before today, ClickHouse users would only see the tables in the `default` database when querying table metadata from ClickHouse system tables such as `system.tables` or `system.columns`.

在此之前，ClickHouse 用户在从 ClickHouse 系统表（例如 `system.tables` 或 `system.columns` ）查询表元数据时，只能看到 `default` 数据库中的表。

Since users already have implicit access to underlying tables in `r0`, we made a change at 11:05 to make this access explicit, so that users can see the metadata of these tables as well. By making sure that all distributed subqueries can run under the initial user, query limits and access grants can be evaluated in a more fine-grained manner, avoiding one bad subquery from a user affecting others.

由于用户已经拥有对 `r0` 中底层表的隐式访问权限，我们在北京时间18日下午7点05分进行了更改，使这种访问权限显式化，以便用户也能查看这些表的元数据。通过确保所有分布式子查询都能以初始用户身份运行，可以更精细地评估查询限制和访问权限，从而避免一个用户的恶意子查询影响其他用户。

The change explained above resulted in all users accessing accurate metadata about tables they have access to. Unfortunately, there were assumptions made in the past, that the list of columns returned by a query like this would only include the “`default`” database:

上述更改使得所有用户都能访问到他们有权访问的表的准确元数据。遗憾的是，过去存在一些假设，即此类查询返回的列列表仅包含“ `default` ”数据库：

```
SELECT  name,  type FROM system.columns WHERE  table = 'http_requests_features' order by name;
```

Note how the query does not filter for the database name. With us gradually rolling out the explicit grants to users of a given ClickHouse cluster, after the change at 11:05 the query above started returning “duplicates” of columns because those were for underlying tables stored in the r0 database.

请注意，该查询并未按数据库名称进行筛选。由于我们逐步向特定 ClickHouse 集群的用户授予显式权限，因此在北京时间18日下午7点05分的更改之后，上述查询开始返回“重复”列，因为这些列对应于存储在 r0 数据库中的底层表。

This, unfortunately, was the type of query that was performed by the Bot Management feature file generation logic to construct each input “feature” for the file mentioned at the beginning of this section. 

不幸的是，这正是 Bot Management 功能文件生成逻辑执行的查询类型，用于构建本节开头提到的文件的每个输入“功能”。

The query above would return a table of columns like the one displayed (simplified example):

上述查询将返回一个类似于所示列的表格（简化示例）：



However, as part of the additional permissions that were granted to the user, the response now contained all the metadata of the `r0` schema effectively more than doubling the rows in the response ultimately affecting the number of rows (i.e. features) in the final file output. 

然而，作为授予用户的额外权限的一部分，响应现在包含了 `r0` 模式的所有元数据，实际上使响应中的行数增加了一倍以上，最终影响了最终文件输出中的行数（即特征数）。

### Memory preallocation 内存预分配

Each module running on our proxy service has a number of limits in place to avoid unbounded memory consumption and to preallocate memory as a performance optimization. In this specific instance, the Bot Management system has a limit on the number of machine learning features that can be used at runtime. Currently that limit is set to 200, well above our current use of ~60 features. Again, the limit exists because for performance reasons we preallocate memory for the features.

为了避免内存无限制消耗并进行内存预分配以优化性能，我们代理服务上运行的每个模块都设置了多项限制。具体来说，机器人管理系统限制了运行时可使用的机器学习特征数量。目前该限制设置为 200，远高于我们当前使用的约 60 个特征。同样，设置此限制的原因是出于性能考虑，我们需要为这些特征预分配内存。

When the bad file with more than 200 features was propagated to our servers, this limit was hit — resulting in the system panicking. The FL2 Rust code that makes the check and was the source of the unhandled error is shown below:

当包含超过 200 个特征的错误文件被传输到我们的服务器时，达到了此限制，导致系统崩溃。下面显示的是执行此检查并导致未处理错误的 FL2 Rust 代码：

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/640fjk9dawDk7f0wJ8Jm5S/668bcf1f574ae9e896671d9eee50da1b/BLOG-3079_7.png" 
  alt="code that generated the error"
  style="max-width: 100%; height: auto; display: block;" />

This resulted in the following panic which in turn resulted in a 5xx error:
这导致了以下系统崩溃，进而引发了 5xx 错误：

```sql
thread fl2_worker_thread panicked: called Result::unwrap() on an Err value
```

### Other impact during the incident 事件中的其他影响

Other systems that rely on our core proxy were impacted during the incident. This included Workers KV and Cloudflare Access. The team was able to reduce the impact to these systems at 13:04, when a patch was made to Workers KV to bypass the core proxy. Subsequently, all downstream systems that rely on Workers KV (such as Access itself) observed a reduced error rate. 

此次事件中，其他依赖我们核心代理的系统也受到了影响，包括 Workers KV 和 Cloudflare Access。团队于北京时间18日下午9点04分对 Workers KV 进行了补丁更新，使它绕过了核心代理，从而降低了这些系统受到的影响。随后，所有依赖 Workers KV 的下游系统（例如 Access 本身）的错误率均有所降低。

The Cloudflare Dashboard was also impacted due to both Workers KV being used internally and Cloudflare Turnstile being deployed as part of our login flow.

由于内部使用了 Workers KV，并且 Cloudflare Turnstile 已部署到我们的登录流程中，Cloudflare 控制面板也受到了影响。

Turnstile was impacted by this outage, resulting in customers who did not have an active dashboard session being unable to log in. This showed up as reduced availability during two time periods: from 11:30 to 13:10, and between 14:40 and 15:30, as seen in the graph below.

Turnstile 系统受到此次故障的影响，导致没有活跃仪表盘会话的客户无法登录。如下图所示，在两个时间段内，系统可用性有所降低：北京时间18日下午7点30 至 9点10分，以及 10点40分 至 11点30分。

<img 
  src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/nB2ZlYyXiGTNngsVotyjN/479a0f9273c160c63925be87592be023/BLOG-3079_8.png" 
  alt="availability of Cloudflare internal APIs during the incident"
  style="max-width: 100%; height: auto; display: block;" />

The first period, from 11:30 to 13:10, was due to the impact to Workers KV, which some control plane and dashboard functions rely upon. This was restored at 13:10, when Workers KV bypassed the core proxy system. The second period of impact to the dashboard occurred after restoring the feature configuration data. A backlog of login attempts began to overwhelm the dashboard. This backlog, in combination with retry attempts, resulted in elevated latency, reducing dashboard availability. Scaling control plane concurrency restored availability at approximately 15:30.

第一个中断期（北京时间18日下午7点30 至 9点10分）是由于 Workers KV 受到影响，部分控制平面和仪表盘功能依赖于 Workers KV。北京时间18日下午9点10分时，Workers KV 绕过了核心代理系统，服务恢复正常。第二个中断期发生在恢复功能配置数据之后。大量的登录尝试导致仪表盘不堪重负。这些尝试加上重试，导致延迟升高，降低了仪表盘的可用性。大约北京时间18日下午11点30分，通过扩展控制平面并发性，仪表盘恢复了可用性。

## Remediation and follow-up steps 补救和后续步骤

Now that our systems are back online and functioning normally, work has already begun on how we will harden them against failures like this in the future. In particular we are:

现在我们的系统已恢复正常运行，我们已经开始着手研究如何加强系统，以防止未来再次发生类似故障。具体来说，我们正在：

- Hardening ingestion of Cloudflare-generated configuration files in the same way we would for user-generated input
- 加强对 Cloudflare 生成的配置文件的摄取，就像我们加强对用户生成输入的摄取一样。
- Enabling more global kill switches for features
- 为功能启用更多全局终止开关
- Eliminating the ability for core dumps or other error reports to overwhelm system resources
- 消除核心转储或其他错误报告占用过多系统资源的可能性
- Reviewing failure modes for error conditions across all core proxy modules
- 审查所有核心代理模块的错误情况故障模式

Today was Cloudflare's worst outage [since 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/). We've had outages that have made our [dashboard unavailable](https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/). Some that have caused [newer features](https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/) to not be available for a period of time. But in the last 6+ years we've not had another outage that has caused the majority of core traffic to stop flowing through our network.

今天发生的故障是 Cloudflare[ 自 2019 年以来](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/)最严重的。我们之前也遇到过导致[控制面板无法访问的](https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/)故障，也曾出现过导致一些[新功能](https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/)暂时无法使用的情况。但在过去的六年多时间里，我们从未遇到过像今天这样导致大部分核心流量停止通过我们网络的故障。

An outage like today is unacceptable. We've architected our systems to be highly resilient to failure to ensure traffic will always continue to flow. When we've had outages in the past it's always led to us building new, more resilient systems.

像今天这样的故障是不可接受的。我们的系统架构设计使其具有极高的故障容错能力，以确保流量始终畅通无阻。过去每次发生故障，我们都会着手构建新的、更具容错性的系统。

On behalf of the entire team at Cloudflare, I would like to apologize for the pain we caused the Internet today.

我谨代表 Cloudflare 的全体员工，对今天我们给互联网带来的困扰表示歉意。

| 北京时间    | 状态                                                         | Status                                                       | 描述                                                         | Description                                                  |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 19:05       | 正常                                                         | Normal.                                                      | 数据库访问控制变更已部署。                                   | Database access control change deployed.                     |
| 19:28       | 冲击开始。                                                   | Impact starts.                                               | 部署到达客户环境后，在客户 HTTP 流量中首次发现错误。         | Deployment reaches customer environments, first errors observed on customer HTTP traffic. |
| 19:32-21:05 | 该团队调查了 Workers KV 服务流量异常增加和故障情况。         | The team investigated elevated traffic levels and errors to Workers KV service. | 最初的症状似乎是 Workers KV 响应速率下降，导致对其他 Cloudflare 服务产生下游影响。 <br /><br />为了使 Workers KV 服务恢复到正常运行水平，我们尝试了流量控制和账户限制等缓解措施。 <br /><br />第一次自动化测试于 11:31 检测到问题，人工调查于 11:32 开始。事件报告于 11:35 创建。 | The initial symptom appeared to be degraded Workers KV response rate causing downstream impact on other Cloudflare services. <br /><br />Mitigations such as traffic manipulation and account limiting were attempted to bring the Workers KV service back to normal operating levels. <br /><br />The first automated test detected the issue at 11:31 and manual investigation started at 11:32. The incident call was created at 11:35. |
| 21:05       | 已实施 Workers KV 和 Cloudflare Access 绕过措施——影响已降低。 | Workers KV and Cloudflare Access bypass implemented — impact reduced. | 调查期间，我们对 Workers KV 和 Cloudflare Access 使用了内部系统绕过机制，使其回退到我们核心代理的旧版本。虽然该问题在之前的代理版本中也存在，但影响较小，具体情况如下所述。 | During investigation, we used internal system bypasses for Workers KV and Cloudflare Access so they fell back to a prior version of our core proxy. Although the issue was also present in prior versions of our proxy, the impact was smaller as described below. |
| 21:37       | 工作重点是将 Bot 管理配置文件回滚到最后一个已知良好的版本。  | Work focused on rollback of the Bot Management configuration file to a last-known-good version. | 我们确信是机器人管理配置文件引发了此次事件。团队分多个工作流程开展工作，寻找修复服务的方法，其中最快的方案是恢复该文件的先前版本。 | We were confident that the Bot Management configuration file was the trigger for the incident. Teams worked on ways to repair the service in multiple workstreams, with the fastest workstream a restore of a previous version of the file. |
| 22:24       | 已停止创建和传播新的机器人管理配置文件。                     | Stopped creation and propagation of new Bot Management configuration files. | 我们发现 Bot Management 模型是导致 500 错误的根源，而这又是由错误的配置文件引起的。我们已停止自动部署新的 Bot Management 配置文件。 | We identified that the Bot Management module was the source of the 500 errors and that this was caused by a bad configuration file. We stopped automatic deployment of new Bot Management configuration files. |
| 22:24       | 新文件测试完成。                                             | Test of new file complete.                                   | 我们观察到使用旧版本的配置文件可以成功恢复，然后集中精力加快全球修复速度。 | We observed successful recovery using the old version of the configuration file and then focused on accelerating the fix globally. |
| 22:30       | 主要影响已解决。下游受影响的服务开始出现错误减少的情况。     | Main impact resolved. Downstream impacted services started observing reduced errors. | 正确的机器人管理配置文件已在全球范围内部署，大多数服务开始正常运行。 | A correct Bot Management configuration file was deployed globally and most services started operating correctly. |
| 01:06       | 所有服务已恢复正常。影响已结束。                             | All services resolved. Impact ends.                          | 所有下游服务已重启，所有操作已完全恢复。                     | All downstream services restarted and all operations fully restored. |
